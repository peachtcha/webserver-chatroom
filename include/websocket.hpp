#pragma once

#include <string>
#include <vector>
#include <functional>
#include <unordered_map>
#include <mutex>
#include <memory>

namespace sim_webserver {

class ChatRoom;
class HTTPServer;

/**
 * @brief WebSocket连接类
 *
 * 处理WebSocket连接的建立、消息收发和关闭
 */
class WebSocketConnection {
public:
    explicit WebSocketConnection(int socket);
    ~WebSocketConnection();

    /**
     * @brief 发送消息
     * @param message 要发送的消息
     */
    void send(const std::string& message);

    /**
     * @brief 接收消息
     * @return 接收到的消息
     */
    std::string receive();

    /**
     * @brief 关闭连接
     */
    void close();

    int socket_;  // 套接字描述符

private:
    bool is_closed_;
};

/**
 * @brief WebSocket服务器类
 *
 * 管理WebSocket连接和处理消息广播
 */
class WebSocketServer {
public:
    friend class HTTPServer;
    /**
     * @brief 构造函数
     * @param port 服务器端口
     */
    explicit WebSocketServer(int port = 8080);

    /**
     * @brief 析构函数
     */
    ~WebSocketServer();

    /**
     * @brief 启动服务器
     */
    void start();

    /**
     * @brief 停止服务器
     */
    void stop();

    /**
     * @brief 广播消息给所有连接
     * @param message 要广播的消息
     */
    void broadcast(const std::string& message);

    /**
     * @brief 设置聊天室
     * @param chat_room 聊天室对象
     */
    void setChatRoom(ChatRoom* chat_room);

protected:
    /**
     * @brief 处理新的WebSocket连接
     * @param socket 客户端套接字
     */
    void handleConnection(int socket);

    /**
     * @brief 处理WebSocket握手
     * @param socket 客户端套接字
     * @param request 原始HTTP请求
     * @return 是否握手成功
     */
    bool handleHandshake(int socket, const std::string& request);

    int port_;
    int server_socket_;
    std::atomic<bool> running_{false};
    std::vector<std::unique_ptr<WebSocketConnection>> connections_;
    std::mutex connections_mutex_;
    ChatRoom* chat_room_{nullptr};
};

} // namespace sim_webserver