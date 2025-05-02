#pragma once

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <functional>
#include <unordered_map>
#include <fstream>
#include <filesystem>
#include "websocket.hpp"
#include "chat_room.hpp"
#include "request.hpp"
#include "response.hpp"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#endif

namespace sim_webserver {



/**
 * @brief HTTP服务器类
 *
 * 处理HTTP请求和WebSocket升级请求
 */
class HTTPServer {
public:
    /**
     * @brief 构造函数
     * @param port 服务器端口
     */
    explicit HTTPServer(int port = 8080);

    /**
     * @brief 析构函数
     */
    ~HTTPServer();

    /**
     * @brief 启动服务器
     */
    void start();

    /**
     * @brief 停止服务器
     */
    void stop();

    /**
     * @brief 设置聊天室
     * @param chat_room 聊天室对象
     */
    void setChatRoom(ChatRoom* chat_room) {
        websocket_server_.setChatRoom(chat_room);
    }

    /**
     * @brief 注册请求处理函数
     * @param path 请求路径
     * @param handler 处理函数
     */
    void registerHandler(const std::string& path,
                        std::function<std::string(const std::string&)> handler);

private:
    /**
     * @brief 处理客户端连接
     * @param socket 客户端套接字
     */
    void handleConnection(int socket);

    /**
     * @brief 检查是否是WebSocket升级请求
     * @param request HTTP请求
     * @return 是否是WebSocket升级请求
     */
    bool isWebSocketUpgradeRequest(const std::string& request);

    /**
     * @brief 处理GET请求
     * @param request HTTP请求
     * @param response HTTP响应
     */
    void handleGetRequest(const Request& request, Response& response);

    /**
     * @brief 发送错误响应
     * @param socket 客户端套接字
     * @param status_code 状态码
     * @param status_text 状态文本
     */
    void sendErrorResponse(int socket, int status_code, const std::string& status_text);

    int port_;
    int server_socket_;
    std::atomic<bool> running_{false};
    WebSocketServer websocket_server_;

    // 请求处理函数映射表
    std::unordered_map<std::string,
                      std::function<std::string(const std::string&)>> handlers_;
};

} // namespace sim_webserver