#!/bin/bash
echo "正在停止当前运行的服务器进程..."
pkill -f "node.*server.js" || true
 
echo ""
echo "正在启动聊天服务器..."
echo ""
npm start 