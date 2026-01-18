# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build and copy to backend
npm run build && cp -r dist/* ../pick-helper/frontend/
```

## Architecture

React + Vite 프론트엔드 프로젝트. MUI (Material-UI) 사용.

### Directory Structure
- **src/pages/**: 페이지 컴포넌트
- **src/routers/**: React Router 설정
- **src/services/**: API 호출 서비스
- **src/hooks/**: 커스텀 훅
- **src/styles/**: 테마 및 스타일

### Build Output
- `npm run build` → `dist/` 폴더 생성
- `dist/` 내용을 `../pick-helper/frontend/`로 복사하여 백엔드에서 서빙

## Related Projects

### Backend (pick-helper)
- **위치**: `../pick-helper`
- **API 서버**: FastAPI (localhost:8000)
- **프론트엔드 서빙**: `frontend/` 폴더의 정적 파일

## Domain Knowledge

### picks2 순회 순서
A1 → B1 → C1 → D1 → E1 → E2 → F1~F4 → G1~G8 → 1~16 → A1 (순환)

### code1별 패턴 정보
| code1 | 패턴 길이 | 개수 | 설명 |
|-------|----------|------|------|
| A1 | 4자리 | 16개 | |
| B1 | 5자리 | 32개 | |
| C1 | 6자리 | 64개 | |
| D1 | 7자리 | 128개 | |
| E1, E2 | 8자리 | 각 128개 | 256개를 2분할 |
| F1~F4 | 9자리 | 각 128개 | 512개를 4분할 |
| G1~G8 | 10자리 | 각 128개 | 1024개를 8분할 |
| 1~16 | 11자리 | 각 128개 | 2048개를 16분할 |

### 주요 페이지
- `/pick-management`: 픽 관리 페이지 (picks2 테이블 CRUD)
- `/game-t1`: 게임 T1 페이지
