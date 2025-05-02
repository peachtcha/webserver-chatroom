#include "websocket.hpp"
#include "chat_room.hpp"
#include <iostream>
#include <sstream>
#include <random>
#include <algorithm>
#include <cstring>
#include <thread>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#endif

// 临时解决方案：不使用jsoncpp库
// #include <json/json.h>

// 声明base64_encode函数
std::string base64_encode(const unsigned char* input, int length);

// 临时解决方案：简单的SHA1函数实现
void SHA1(const unsigned char* d, size_t n, unsigned char* md) {
    // 简单实现，仅用于测试
    for (size_t i = 0; i < 20; ++i) {
        md[i] = static_cast<unsigned char>(i + 1);
    }
}

namespace sim_webserver {

WebSocketServer::WebSocketServer(int port)
    : port_(port), server_socket_(-1) {
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

    if (bind(server_socket_, (struct sockaddr*)&server_addr, sizeof(server_addr)) == -1) {
        std::cerr << "Failed to bind socket" << std::endl;
#ifdef _WIN32
        closesocket(server_socket_);
#else
        close(server_socket_);
#endif
        server_socket_ = -1;
        return;
    }
}

WebSocketServer::~WebSocketServer() {
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

void WebSocketServer::start() {
    if (server_socket_ == -1) {
        return;
    }

    // 开始监听
    if (listen(server_socket_, 5) == -1) {
        std::cerr << "Failed to listen on socket" << std::endl;
        return;
    }

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

    std::cout << "WebSocket server started on port " << port_ << std::endl;
}

void WebSocketServer::stop() {
    running_ = false;
    {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        for (auto& conn : connections_) {
            conn->close();
        }
        connections_.clear();
    }
}

void WebSocketServer::broadcast(const std::string& message) {
    std::lock_guard<std::mutex> lock(connections_mutex_);
    for (auto& conn : connections_) {
        conn->send(message);
    }
}

void WebSocketServer::setChatRoom(ChatRoom* chat_room) {
    chat_room_ = chat_room;
}

void WebSocketServer::handleConnection(int socket) {
    char buffer[4096];
    memset(buffer, 0, sizeof(buffer));

    // 读取握手请求
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
    if (!handleHandshake(socket, request)) {
#ifdef _WIN32
        closesocket(socket);
#else
        close(socket);
#endif
        return;
    }

    // 创建WebSocket连接
    auto connection = std::make_unique<WebSocketConnection>(socket);
    {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        connections_.push_back(std::move(connection));
    }

    // 处理消息
    while (running_) {
        std::string message = connections_.back()->receive();
        if (message.empty()) {
            break;
        }

        // 临时解决方案：简单解析消息
        // 假设消息格式为 type:username:content
        size_t first_colon = message.find(':');
        size_t second_colon = message.find(':', first_colon + 1);

        if (first_colon != std::string::npos && second_colon != std::string::npos) {
            std::string type = message.substr(0, first_colon);
            std::string username = message.substr(first_colon + 1, second_colon - first_colon - 1);
            std::string content = message.substr(second_colon + 1);

            if (type == "join" && chat_room_) {
                chat_room_->join(username, connections_.back().get());
            } else if (type == "message" && chat_room_) {
                chat_room_->handleMessage(username, content);
            }
        }
    }

    // 移除连接
    {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        connections_.erase(
            std::remove_if(connections_.begin(), connections_.end(),
                [socket](const std::unique_ptr<WebSocketConnection>& conn) {
                    return conn->socket_ == socket;
                }),
            connections_.end()
        );
    }
}

bool WebSocketServer::handleHandshake(int socket, const std::string& request) {
    // 解析Sec-WebSocket-Key
    std::string key;
    size_t key_pos = request.find("Sec-WebSocket-Key: ");
    if (key_pos != std::string::npos) {
        size_t key_end = request.find("\r\n", key_pos);
        if (key_end != std::string::npos) {
            key = request.substr(key_pos + 19, key_end - (key_pos + 19));
        }
    }

    if (key.empty()) {
        return false;
    }

    // 生成Sec-WebSocket-Accept
    const std::string magic_string = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    std::string accept_key = key + magic_string;

    unsigned char hash[20];
    SHA1(reinterpret_cast<const unsigned char*>(accept_key.c_str()),
         accept_key.length(), hash);

    std::string base64_accept = base64_encode(hash, 20);

    // 发送握手响应
    std::string response =
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: " + base64_accept + "\r\n\r\n";

    send(socket, response.c_str(), response.length(), 0);
    return true;
}

} // namespace sim_webserver