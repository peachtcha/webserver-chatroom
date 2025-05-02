#include "response.hpp"
#include <sstream>

namespace sim_webserver {

Response::Response(int status_code, const std::string& status_message)
    : status_code_(status_code), status_message_(status_message) {
    // 设置默认响应头
    setHeader("Server", "SimWebServer/1.0");
    setHeader("Connection", "close");
}

void Response::setHeader(const std::string& key, const std::string& value) {
    headers_[key] = value;
}

void Response::setBody(const std::string& body) {
    body_ = body;
}

void Response::setStatusCode(int code) {
    status_code_ = code;
}

void Response::setStatusMessage(const std::string& message) {
    status_message_ = message;
}

std::string Response::toString() const {
    std::ostringstream oss;

    // 写入状态行
    oss << "HTTP/1.1 " << status_code_ << " " << status_message_ << "\r\n";

    // 写入响应头
    for (const auto& header : headers_) {
        oss << header.first << ": " << header.second << "\r\n";
    }

    // 写入空行
    oss << "\r\n";

    // 写入响应体
    oss << body_;

    return oss.str();
}

} // namespace sim_webserver