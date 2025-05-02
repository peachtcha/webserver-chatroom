#include "chat_room.hpp"
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace sim_webserver {

std::string ChatMessage::toJson() const {
    // 临时解决方案：使用简单的格式
    return type + ":" + sender + ":" + content;
}

ChatRoom::ChatRoom() = default;

void ChatRoom::join(const std::string& username, WebSocketConnection* connection) {
    std::lock_guard<std::mutex> lock(connections_mutex_);

    // 检查用户名是否已存在
    if (connections_.find(username) != connections_.end()) {
        // 发送错误消息
        ChatMessage error_msg = createSystemMessage("Username exists");
        connection->send(error_msg.toJson());
        return;
    }

    // 添加用户
    connections_[username] = connection;

    // 广播用户加入消息
    ChatMessage join_msg = createSystemMessage(username + " joined");
    broadcastMessage(join_msg);

    // 发送欢迎消息
    std::string welcome = "Welcome! Online users: " + std::to_string(connections_.size());
    ChatMessage welcome_msg = createSystemMessage(welcome);
    connection->send(welcome_msg.toJson());
}

void ChatRoom::leave(const std::string& username) {
    std::lock_guard<std::mutex> lock(connections_mutex_);

    auto it = connections_.find(username);
    if (it != connections_.end()) {
        connections_.erase(it);

        // 广播用户离开消息
        ChatMessage leave_msg = createSystemMessage(username + " left");
        broadcastMessage(leave_msg);
    }
}

void ChatRoom::handleMessage(const std::string& username, const std::string& message) {
    std::lock_guard<std::mutex> lock(connections_mutex_);

    // 检查用户是否存在
    if (connections_.find(username) == connections_.end()) {
        return;
    }

    // 创建并广播消息
    ChatMessage chat_msg = createUserMessage(username, message);
    broadcastMessage(chat_msg);
}

std::vector<std::string> ChatRoom::getOnlineUsers() const {
    std::lock_guard<std::mutex> lock(connections_mutex_);
    std::vector<std::string> users;
    for (const auto& pair : connections_) {
        users.push_back(pair.first);
    }
    return users;
}

void ChatRoom::broadcastMessage(const ChatMessage& message) {
    std::lock_guard<std::mutex> lock(connections_mutex_);
    std::string json_msg = message.toJson();

    for (const auto& pair : connections_) {
        pair.second->send(json_msg);
    }
}

ChatMessage ChatRoom::createSystemMessage(const std::string& content) const {
    ChatMessage msg;
    msg.sender = "System";
    msg.content = content;
    msg.timestamp = std::time(nullptr);
    msg.type = "system";
    return msg;
}

ChatMessage ChatRoom::createUserMessage(const std::string& username,
                                      const std::string& content) const {
    ChatMessage msg;
    msg.sender = username;
    msg.content = content;
    msg.timestamp = std::time(nullptr);
    msg.type = "message";
    return msg;
}

} // namespace sim_webserver