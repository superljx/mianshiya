import { generateService } from "@umijs/openapi";
import { fileURLToPath } from "node:url";

const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:9166";
const schemaPath = process.env.OPENAPI_SCHEMA_URL || `${backendOrigin}/api/v2/api-docs`;

try {
  await generateService({
    requestLibPath: "import request from '@/lib/openapiRequest'",
    schemaPath,
    serversPath: fileURLToPath(new URL("./src/api/generated", import.meta.url)),
    projectName: "mianshiya",
  });
  console.info("接口代码已生成至 src/api/generated，现有手写业务接口保持不变。");
} catch (error) {
  console.error(`接口生成失败，请确认后端已启动且 Swagger 文档可访问：${schemaPath}`);
  console.error(error instanceof Error ? error.message : "未知错误");
  process.exitCode = 1;
}
