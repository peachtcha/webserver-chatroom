#pragma once

#include <string>
#include <unordered_map>

namespace sim_webserver {

/**
 * @brief HTTP响应类
 *
 * 用于构建和发送HTTP响应，包括：
 * 1. 设置状态码
 * 2. 设置响应头
 * 3. 设置响应体
 * 4. 生成响应字符串
 */
class Response {
public:
    /**
     * @brief 构造函数
     * @param status_code 状态码
     * @param status_message 状态消息
     */
    Response(int status_code = 200,
             const std::string& status_message = "OK");

    /**
     * @brief 设置响应头
     * @param key 响应头键名
     * @param value 响应头值
     */
    void setHeader(const std::string& key, const std::string& value);

    /**
     * @brief 设置响应体
     * @param body 响应体内容
     */
    void setBody(const std::string& body);

    /**
     * @brief 设置状态码
     * @param code 状态码
     */
    void setStatusCode(int code);

    /**
     * @brief 设置状态消息
     * @param message 状态消息
     */
    void setStatusMessage(const std::string& message);

    /**
     * @brief 生成响应字符串
     * @return 完整的HTTP响应字符串
     */
    std::string toString() const;

private:
    int status_code_;                       // 状态码
    std::string status_message_;            // 状态消息
    std::unordered_map<std::string,
                      std::string> headers_; // 响应头
    std::string body_;                      // 响应体
};

} // namespace sim_webserver