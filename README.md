# Landing Hub - SaaS Platform

## Tổng Quan
Landing Hub là nền tảng SaaS hỗ trợ tạo landing page, marketplace, AI content, và quản lý leads. Dự án sử dụng monorepo với pnpm.

## Cấu Trúc Dự Án
- `apps/web`: Frontend web (ReactJS)
- `apps/mobile`: Frontend mobile (React Native)
- `packages/shared`: Code chung
- `packages/api`: Module API
- `backend`: Backend (Node.js)

## Hướng Dẫn Chạy
1. Cài đặt: `pnpm install`
2. Chạy web: `pnpm --filter landinghub-web build`
3. Chạy mobile: `pnpm --filter mobile start`
4. Chạy backend: `pnpm --filter backend start`

## Yêu Cầu Hệ Thống
- Node.js 18+
- pnpm 8+
- MongoDB

## Liên Hệ
- Tác giả: Nguyen Thi Tuong Vi - Tan Kiet
- GitHub: [vicute0707/landing-hub](https://github.com/vicute0707/landing-hub)