#include "request.hpp"
#include <sstream>
#include <algorithm>
#include <iostream>

namespace sim_webserver {

Request::Request(const std::string& raw_request) {
    parse(raw_request);
}

void Request::parse(const std::string& raw_request) {
    std::istringstream iss(raw_request);
    std::string line;

    // 解析请求行
    if (std::getline(iss, line)) {
        std::cout << "请求行: " << line << std::endl;
        std::istringstream request_line(line);
        request_line >> method_ >> path_;
        std::cout << "方法: " << method_ << ", 路径: " << path_ << std::endl;
    }

    // 解析请求头
    while (std::getline(iss, line) && line != "\r") {
        size_t colon_pos = line.find(':');
        if (colon_pos != std::string::npos) {
            std::string key = line.substr(0, colon_pos);
            std::string value = line.substr(colon_pos + 1);
            // 去除首尾空白字符
            key.erase(0, key.find_first_not_of(" \t\r\n"));
            key.erase(key.find_last_not_of(" \t\r\n") + 1);
            value.erase(0, value.find_first_not_of(" \t\r\n"));
            value.erase(value.find_last_not_of(" \t\r\n") + 1);
            headers_[key] = value;
        }
    }

    // 解析请求体
    body_ = raw_request.substr(raw_request.find("\r\n\r\n") + 4);
}

std::string Request::getHeader(const std::string& key) const {
    auto it = headers_.find(key);
    return it != headers_.end() ? it->second : "";
}

} // namespace sim_webserver