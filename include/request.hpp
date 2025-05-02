#pragma once

#include <string>
#include <unordered_map>

namespace sim_webserver {

/**
 * @brief HTTP请求类
 * 
 * 用于解析和处理HTTP请求，包括：
 * 1. 解析请求方法（GET, POST等）
 * 2. 解析请求路径
 * 3. 解析请求头
 * 4. 解析请求体
 */
class Request {
public:
    /**
     * @brief 构造函数
     * @param raw_request 原始请求数据
     */
    explicit Request(const std::string& raw_request);

    /**
     * @brief 获取请求方法
     * @return 请求方法（GET, POST等）
     */
    const std::string& getMethod() const { return method_; }

    /**
     * @brief 获取请求路径
     * @return 请求路径
     */
    const std::string& getPath() const { return path_; }

    /**
     * @brief 获取请求头
     * @param key 请求头键名
     * @return 请求头值
     */
    std::string getHeader(const std::string& key) const;

    /**
     * @brief 获取请求体
     * @return 请求体内容
     */
    const std::string& getBody() const { return body_; }

private:
    /**
     * @brief 解析原始请求数据
     * @param raw_request 原始请求数据
     */
    void parse(const std::string& raw_request);

    std::string method_;                    // 请求方法
    std::string path_;                      // 请求路径
    std::unordered_map<std::string, 
                      std::string> headers_; // 请求头
    std::string body_;                      // 请求体
};

} // namespace sim_webserver 