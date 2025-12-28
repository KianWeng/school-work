# SSL 证书目录

此目录用于存放 SSL 证书文件。

## 生成自签名证书（开发测试）

```bash
# 在项目根目录执行
mkdir -p ssl
cd ssl

# 生成私钥
openssl genrsa -out server.key 2048

# 生成证书签名请求
openssl req -new -key server.key -out server.csr

# 生成自签名证书（有效期365天）
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# 清理临时文件
rm server.csr
```

## 使用 mkcert（推荐本地开发）

```bash
# 安装 mkcert（如果未安装）
# Linux: 下载 https://github.com/FiloSottile/mkcert/releases
# macOS: brew install mkcert
# Windows: 下载并添加到 PATH

# 安装本地 CA
mkcert -install

# 生成证书
cd ssl
mkcert localhost 127.0.0.1 ::1
mv localhost+2.pem server.crt
mv localhost+2-key.pem server.key
```

## 文件说明

- `server.crt`: SSL 证书文件
- `server.key`: SSL 私钥文件

**注意**：这些文件包含敏感信息，不要提交到版本控制系统！

将此目录添加到 `.gitignore`：

```
ssl/*.crt
ssl/*.key
ssl/*.pem
```

