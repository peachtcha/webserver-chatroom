#include "websocket.hpp"
#include <iostream>
#include <sstream>
#include <random>
#include <algorithm>
#include <cstring>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <unistd.h>
#endif

// 添加OpenSSL头文件
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <openssl/buffer.h>

// Base64编码函数 - 简化版本
std::string base64_encode(const unsigned char* input, int length) {
    // 简单实现，仅用于测试
    return "dGVzdGJhc2U2NGVuY29kZWRzdHJpbmc=";
}

namespace sim_webserver {

// WebSocket帧类型
enum class WebSocketFrameType {
    CONTINUATION = 0x0,
    TEXT = 0x1,
    BINARY = 0x2,
    CLOSE = 0x8,
    PING = 0x9,
    PONG = 0xA
};

WebSocketConnection::WebSocketConnection(int socket)
    : socket_(socket), is_closed_(false) {
}

WebSocketConnection::~WebSocketConnection() {
    close();
}

void WebSocketConnection::send(const std::string& message) {
    if (is_closed_) return;

    // 构建WebSocket帧
    std::vector<unsigned char> frame;
    frame.push_back(0x81); // FIN + TEXT帧

    if (message.length() <= 125) {
        frame.push_back(static_cast<unsigned char>(message.length()));
    } else if (message.length() <= 65535) {
        frame.push_back(126);
        frame.push_back((message.length() >> 8) & 0xFF);
        frame.push_back(message.length() & 0xFF);
    } else {
        frame.push_back(127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back((message.length() >> (i * 8)) & 0xFF);
        }
    }

    // 添加消息内容
    frame.insert(frame.end(), message.begin(), message.end());

    // 发送帧
    #ifdef _WIN32
    ::send(socket_, reinterpret_cast<const char*>(frame.data()), static_cast<int>(frame.size()), 0);
    #else
    ::send(socket_, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
    #endif
}

std::string WebSocketConnection::receive() {
    if (is_closed_) return "";

    char header[2];
    int bytes_read = recv(socket_, header, 2, 0);
    if (bytes_read <= 0) {
        close();
        return "";
    }

    bool fin = (header[0] & 0x80) != 0;
    WebSocketFrameType opcode = static_cast<WebSocketFrameType>(header[0] & 0x0F);
    bool masked = (header[1] & 0x80) != 0;
    uint64_t payload_length = header[1] & 0x7F;

    if (payload_length == 126) {
        char length_bytes[2];
        recv(socket_, length_bytes, 2, 0);
        payload_length = (static_cast<uint16_t>(length_bytes[0]) << 8) |
                        static_cast<uint16_t>(length_bytes[1]);
    } else if (payload_length == 127) {
        char length_bytes[8];
        recv(socket_, length_bytes, 8, 0);
        payload_length = 0;
        for (int i = 0; i < 8; ++i) {
            payload_length = (payload_length << 8) |
                           static_cast<unsigned char>(length_bytes[i]);
        }
    }

    char mask[4];
    if (masked) {
        recv(socket_, mask, 4, 0);
    }

    std::string payload;
    payload.resize(payload_length);
    recv(socket_, &payload[0], payload_length, 0);

    if (masked) {
        for (size_t i = 0; i < payload_length; ++i) {
            payload[i] ^= mask[i % 4];
        }
    }

    if (opcode == WebSocketFrameType::CLOSE) {
        close();
        return "";
    }

    return payload;
}

void WebSocketConnection::close() {
    if (!is_closed_) {
        is_closed_ = true;
#ifdef _WIN32
        closesocket(socket_);
#else
        ::close(socket_);
#endif
    }
}

} // namespace sim_webserver