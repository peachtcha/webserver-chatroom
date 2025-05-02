cmake_minimum_required(VERSION 3.10)
project(sim_webserver VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找必要的包
find_package(OpenSSL REQUIRED)

# 注释掉jsoncpp相关配置，使用简单的字符串处理替代
# set(JSONCPP_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/third_party/jsoncpp/include")
# set(JSONCPP_LIBRARY "${CMAKE_SOURCE_DIR}/third_party/jsoncpp/lib/jsoncpp.lib")

# 添加源文件
set(SOURCES
    src/main.cpp
    src/server.cpp
    src/websocket.cpp
    src/websocket_server.cpp
    src/chat_room.cpp
    src/request.cpp
    src/response.cpp
)

# 添加头文件目录
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OPENSSL_INCLUDE_DIR}
)

# 创建可执行文件
add_executable(sim_webserver ${SOURCES})

# 链接库
target_link_libraries(sim_webserver PRIVATE
    ${OPENSSL_LIBRARIES}
)

# 安装目标
install(TARGETS sim_webserver DESTINATION bin)

# 包含头文件目录
target_include_directories(sim_webserver PRIVATE include)

# 添加编译选项
if(MSVC)
    target_compile_options(sim_webserver PRIVATE /W4)
    # 添加Windows特定的链接库
    target_link_libraries(sim_webserver PRIVATE ws2_32)
else()
    target_compile_options(sim_webserver PRIVATE -Wall -Wextra)
endif()