#pragma once

#include <string>
#include <unordered_map>
#include <mutex>
#include <memory>
#include <ctime>
#include "websocket.hpp"

namespace sim_webserver {

/**
 * @brief 聊天室消息类
 */
struct ChatMessage {
    std::string sender;    // 发送者
    std::string content;   // 消息内容
    std::time_t timestamp; // 时间戳
    std::string type;      // 消息类型（普通消息、系统消息等）

    /**
     * @brief 将消息转换为JSON字符串
     * @return JSON格式的消息字符串
     */
    std::string toJson() const;
};

/**
 * @brief 聊天室类
 * 
 * 管理聊天室用户和消息
 */
class ChatRoom {
public:
    /**
     * @brief 构造函数
     */
    ChatRoom();

    /**
     * @brief 用户加入聊天室
     * @param username 用户名
     * @param connection WebSocket连接
     */
    void join(const std::string& username, WebSocketConnection* connection);

    /**
     * @brief 用户离开聊天室
     * @param username 用户名
     */
    void leave(const std::string& username);

    /**
     * @brief 处理用户消息
     * @param username 用户名
     * @param message 消息内容
     */
    void handleMessage(const std::string& username, const std::string& message);

    /**
     * @brief 获取当前在线用户列表
     * @return 用户名列表
     */
    std::vector<std::string> getOnlineUsers() const;

private:
    /**
     * @brief 广播消息给所有用户
     * @param message 消息对象
     */
    void broadcastMessage(const ChatMessage& message);

    /**
     * @brief 生成系统消息
     * @param content 消息内容
     * @return 系统消息对象
     */
    ChatMessage createSystemMessage(const std::string& content) const;

    /**
     * @brief 生成用户消息
     * @param username 用户名
     * @param content 消息内容
     * @return 用户消息对象
     */
    ChatMessage createUserMessage(const std::string& username, 
                                const std::string& content) const;

    // 用户连接映射表
    std::unordered_map<std::string, WebSocketConnection*> connections_;
    mutable std::mutex connections_mutex_;
};

} // namespace sim_webserver 