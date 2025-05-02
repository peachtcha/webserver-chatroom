#include "server.hpp"
#include "chat_room.hpp"
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    try {
        // 创建聊天室
        sim_webserver::ChatRoom chat_room;

        // 创建HTTP服务器
        sim_webserver::HTTPServer server(9090);

        // 设置聊天室
        server.setChatRoom(&chat_room);

        // 启动服务器
        server.start();

        std::cout << "服务器已启动，按Ctrl+C退出..." << std::endl;

        // 保持服务器运行
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    } catch (const std::exception& e) {
        std::cerr << "错误: " << e.what() << std::endl;
        return 1;
    }

    return 0;
} 