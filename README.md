# ☕ 로컬커피 (Local Coffee) - O2O 키오스크 웹 서비스

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

> **O2O(Online to Offline) 카페 키오스크 & 어드민 시스템입니다.** <br/>
> 고객이 키오스크에서 결제하면 사장님의 어드민 화면에 실시간으로 주문이 연동되며, 메뉴 관리와 매출 통계까지 하나의 서비스에서 처리할 수 있습니다.

**라이브 데모 웹사이트:** [cafe-kiosk.vercel.app)](https://cafe-kiosk.vercel.app/)

---

## 주요 화면 및 기능 (Preview)

### 1. 고객용 키오스크 화면 (`/`)
* **실시간 메뉴 동기화:** 관리자가 등록/수정한 메뉴와 품절 상태가 새로고침 없이 실시간 반영됩니다.
* **디테일한 옵션 선택:** 커피 온도(HOT/ICE), 사이즈업, 샷 추가 및 수량 조절 기능을 제공합니다.
* **장바구니 전역 상태 관리:** `Zustand`를 활용하여 장바구니 데이터를 가볍고 빠르게 관리합니다.
* **스마트 영수증 UX:** 결제 시 일일 순차 주문번호(1, 2, 3...)를 발급하고 5초 뒤 자동으로 메인 화면으로 복귀합니다.

### 2. 사장님용 어드민 화면 (`/admin`)
* **주문 현황 실시간 모니터링:** `Firebase onSnapshot`을 활용하여 고객의 주문을 웹소켓처럼 0.1초 만에 수신합니다.
* **데이터 시각화 (매출 통계):** 일일 총매출, 판매 건수, 실시간 인기 메뉴 Top 3 랭킹을 대시보드 형태로 제공합니다.
* **메뉴 CRUD 및 스토리지 연동:** `Firebase Storage`를 활용한 메뉴 이미지 업로드 및 카테고리, 가격, 품절 여부를 즉각적으로 제어할 수 있습니다.
* **DB 초기화 기능:** 영업 마감 시 당일 주문 데이터를 초기화하여 DB 용량을 효율적으로 관리합니다.

---

## 기술 스택 및 도입 배경

* **Framework:** `Next.js 14` (App Router) - 직관적인 라우팅과 빠른 렌더링을 위해 도입.
* **Language:** `TypeScript` - 런타임 에러 방지 및 주문/메뉴 데이터 인터페이스 규격화를 위해 도입.
* **Styling:** `Tailwind CSS` - 유틸리티 클래스를 활용한 빠른 반응형 UI/UX 개발.
* **State Management:** `Zustand` - Redux 대비 가벼운 보일러플레이트로 장바구니 로직을 단순화하기 위해 선택.
* **BaaS (DB & Storage):** `Firebase` (Firestore, Storage) - 서버 구축 없이 O2O 서비스의 핵심인 '실시간 양방향 데이터 연동'을 구현하기 위해 채택.

---

## 트러블 슈팅 & 고민했던 점

1. **디저트 메뉴 결제 시 파이어베이스 `undefined` 에러 해결**
   * **문제:** 옵션이 없는 디저트 메뉴를 장바구니에 담을 때 `options: undefined` 값이 파이어베이스로 전송되면서 결제 에러 발생.
   * **해결:** `options` 객체를 선택적으로 추가하도록 로직을 수정하여, 디저트 메뉴는 옵션 프로퍼티 자체가 생성되지 않도록 분기 처리함.
     
2. **무한 스크롤 & DB 용량 관리 고민**
   * **문제:** 주문 데이터가 영구적으로 쌓일 경우 파이어베이스 무료 제공량을 초과할 위험 인지.
   * **해결:** 어드민 페이지에 [영업 마감] 버튼을 구현하여, 클릭 시 당일 데이터를 일괄 삭제(`deleteDoc`)하도록 설계하여 유지보수성 확보.
     
3. **이미지 렌더링 최적화**
   * **문제:** 파이어베이스 스토리지의 원본 이미지를 그대로 띄울 경우 로딩 지연 발생.
   * **해결:** Next.js의 `next/image` 컴포넌트를 적용하고 `next.config.ts`에 외부 도메인을 허용하여 이미지 최적화 및 레이아웃 시프트를 방지함.

---

## 로컬 실행 방법 (Getting Started)

```bash
# 1. 패키지 설치
npm install

# 2. 파이어베이스 환경 변수 설정 (firebase.ts)
# Firestore 및 Storage 설정 필요

# 3. 개발 서버 실행
npm run dev
```

## 로컬 키오스크 실제 작동 이미지

<img width="2160" height="3840" alt="cafe-kiosk vercel app_" src="https://github.com/user-attachments/assets/7302550c-a86a-44ad-9ad7-a99a2cc5b6bf" />
<img width="2160" height="3840" alt="cafe-kiosk vercel app_ (1)" src="https://github.com/user-attachments/assets/68363535-edf7-4df6-ac24-97f3292cb4e0" />
<img width="2160" height="3840" alt="cafe-kiosk vercel app_admin (1)" src="https://github.com/user-attachments/assets/4ee3cdab-2cad-4f4e-944b-340520bcaa02" />
<img width="2160" height="3840" alt="cafe-kiosk vercel app_admin (2)" src="https://github.com/user-attachments/assets/1fb363db-9286-4f1b-a1c3-999d24d2132f" />
<img width="2160" height="3840" alt="cafe-kiosk vercel app_admin" src="https://github.com/user-attachments/assets/11280227-2b36-429f-88e9-71be65052177" />

