#include "server.hpp"
#include "websocket.hpp"
#include <iostream>
#include <sstream>
#include <algorithm>
#include <cstring>
#include <thread>
#include <filesystem>

namespace sim_webserver {

HTTPServer::HTTPServer(int port)
    : port_(port), server_socket_(-1), websocket_server_(port) {
#ifdef _WIN32
    // 初始化Winsock
    WSADATA wsaData;
    int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (result != 0) {
        std::cerr << "WSAStartup failed with error: " << result << std::endl;
        return;
    }
#endif

    // 创建服务器套接字
    server_socket_ = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket_ == -1) {
        std::cerr << "Failed to create socket" << std::endl;
        return;
    }

    // 设置套接字选项
    int opt = 1;
    if (setsockopt(server_socket_, SOL_SOCKET, SO_REUSEADDR,
                  reinterpret_cast<const char*>(&opt), sizeof(opt)) == -1) {
        std::cerr << "Failed to set socket options" << std::endl;
#ifdef _WIN32
        closesocket(server_socket_);
#else
        close(server_socket_);
#endif
        server_socket_ = -1;
        return;
    }

    // 绑定地址和端口
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(port_);

    std::cout << "尝试绑定端口: " << port_ << std::endl;

    if (bind(server_socket_, (struct sockaddr*)&server_addr, sizeof(server_addr)) == -1) {
        std::cerr << "Failed to bind socket, error code: " << WSAGetLastError() << std::endl;
#ifdef _WIN32
        closesocket(server_socket_);
#else
        close(server_socket_);
#endif
        server_socket_ = -1;
        return;
    }

    std::cout << "成功绑定端口: " << port_ << std::endl;
}

HTTPServer::~HTTPServer() {
    stop();
    if (server_socket_ != -1) {
#ifdef _WIN32
        closesocket(server_socket_);
        WSACleanup();
#else
        close(server_socket_);
#endif
    }
}

void HTTPServer::start() {
    if (server_socket_ == -1) {
        return;
    }

    // 开始监听
    if (listen(server_socket_, 5) == -1) {
        std::cerr << "Failed to listen on socket" << std::endl;
        return;
    }

    // 启动WebSocket服务器
    websocket_server_.start();

    running_ = true;
    std::thread([this]() {
        while (running_) {
            // 接受客户端连接
            struct sockaddr_in client_addr;
#ifdef _WIN32
            int client_len = sizeof(client_addr);
#else
            socklen_t client_len = sizeof(client_addr);
#endif
            int client_socket = accept(server_socket_,
                                     (struct sockaddr*)&client_addr,
                                     &client_len);

            if (client_socket == -1) {
                if (running_) {
                    std::cerr << "Failed to accept client connection" << std::endl;
                }
                continue;
            }

            // 在新线程中处理连接
            std::thread([this, client_socket]() {
                handleConnection(client_socket);
            }).detach();
        }
    }).detach();

    std::cout << "HTTP server started on port " << port_ << std::endl;
}

void HTTPServer::stop() {
    running_ = false;
    websocket_server_.stop();
}

void HTTPServer::handleConnection(int socket) {
    char buffer[4096];
    memset(buffer, 0, sizeof(buffer));

    // 读取请求
    int bytes_read = recv(socket, buffer, sizeof(buffer) - 1, 0);
    if (bytes_read <= 0) {
#ifdef _WIN32
        closesocket(socket);
#else
        close(socket);
#endif
        return;
    }

    std::string request(buffer, bytes_read);

    // 输出调试信息
    std::cout << "收到请求: " << std::endl;
    std::cout << request.substr(0, 100) << "..." << std::endl;

    // 检查是否是WebSocket升级请求
    if (isWebSocketUpgradeRequest(request)) {
        std::cout << "WebSocket升级请求" << std::endl;
        // 将连接交给WebSocket服务器处理
        websocket_server_.handleConnection(socket);
        return;
    }

    std::cout << "HTTP请求" << std::endl;

    // 处理HTTP请求
    Request http_request(request);

    // 处理请求
    Response response;
    if (http_request.getMethod() == "GET") {
        handleGetRequest(http_request, response);
    } else {
        sendErrorResponse(socket, 405, "Method Not Allowed");
        return;
    }

    // 发送响应
    std::string response_str = response.toString();
    std::cout << "发送响应: " << std::endl;
    std::cout << response_str.substr(0, 100) << "..." << std::endl;

    int bytes_sent = send(socket, response_str.c_str(), response_str.length(), 0);
    std::cout << "发送字节数: " << bytes_sent << std::endl;

    if (bytes_sent <= 0) {
        std::cerr << "发送响应失败, error code: " << WSAGetLastError() << std::endl;
    }

#ifdef _WIN32
    closesocket(socket);
#else
    close(socket);
#endif
}

bool HTTPServer::isWebSocketUpgradeRequest(const std::string& request) {
    // 检查是否是WebSocket升级请求
    return request.find("Upgrade: websocket") != std::string::npos &&
           request.find("Connection: Upgrade") != std::string::npos;
}

void HTTPServer::handleGetRequest(const Request& request, Response& response) {
    std::string path = request.getPath();
    if (path == "/") {
        path = "/index.html";
    }

    // 构建文件路径
    std::filesystem::path file_path = std::filesystem::current_path() / "public" / path.substr(1);

    // 输出调试信息
    std::cout << "请求路径: " << path << std::endl;
    std::cout << "文件路径: " << file_path.string() << std::endl;

    // 检查文件是否存在
    if (!std::filesystem::exists(file_path)) {
        std::cout << "文件不存在: " << file_path.string() << std::endl;
        response.setStatusCode(404);
        response.setStatusMessage("Not Found");
        response.setBody("404 Not Found");
        return;
    }

    std::cout << "文件存在: " << file_path.string() << std::endl;

    // 读取文件内容
    std::ifstream file(file_path, std::ios::binary);
    if (!file) {
        std::cout << "无法打开文件: " << file_path.string() << std::endl;
        response.setStatusCode(500);
        response.setStatusMessage("Internal Server Error");
        response.setBody("500 Internal Server Error");
        return;
    }

    std::cout << "成功打开文件: " << file_path.string() << std::endl;

    // 设置响应头
    response.setStatusCode(200);
    response.setStatusMessage("OK");

    // 设置Content-Type
    std::string extension = file_path.extension().string();
    if (extension == ".html") {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
    } else if (extension == ".css") {
        response.setHeader("Content-Type", "text/css");
    } else if (extension == ".js") {
        response.setHeader("Content-Type", "application/javascript");
    } else {
        response.setHeader("Content-Type", "text/plain");
    }

    // 读取文件内容
    std::string content((std::istreambuf_iterator<char>(file)),
                       std::istreambuf_iterator<char>());
    response.setBody(content);
}

void HTTPServer::sendErrorResponse(int socket, int status_code, const std::string& status_text) {
    Response response(status_code, status_text);
    response.setBody(status_text);

    std::string response_str = response.toString();
    send(socket, response_str.c_str(), response_str.length(), 0);

#ifdef _WIN32
    closesocket(socket);
#else
    close(socket);
#endif
}

} // namespace sim_webserver