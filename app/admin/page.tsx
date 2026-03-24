// app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc } from "firebase/firestore"; 
import { db } from "../firebase"; 

export default function AdminPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]); // ⭐ 메뉴 데이터 상태
  const [activeTab, setActiveTab] = useState<'orders' | 'stats' | 'menus'>('orders');

  // 신규 메뉴 등록용 상태
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'coffee' });

  useEffect(() => {
    // 1. 주문 데이터 실시간 연동
    const unsubOrders = onSnapshot(collection(db, "cafe_orders"), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      orders.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setAllOrders(orders);
    });

    // 2. ⭐ 메뉴 데이터 실시간 연동
    const unsubMenus = onSnapshot(collection(db, "cafe_menus"), (snapshot) => {
      const fetchedMenus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenus(fetchedMenus);
    });

    return () => { unsubOrders(); unsubMenus(); };
  }, []);

  // 주문 완료 처리
  const completeOrder = async (orderId: string) => {
    await updateDoc(doc(db, "cafe_orders", orderId), { status: "completed" });
  };

  // ⭐ [데이터 초기화] 영업 마감 버튼 함수
  const handleCloseBusiness = async () => {
    if (!window.confirm("🚨 정말 영업을 마감하시겠습니까?\n오늘 들어온 모든 주문 데이터가 완전히 삭제됩니다.")) return;
    try {
      const snapshot = await getDocs(collection(db, "cafe_orders"));
      const promises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      alert("영업 마감 처리가 완료되었습니다. 주문 내역이 초기화되었습니다.");
    } catch (error) {
      alert("초기화 중 오류가 발생했습니다.");
    }
  };

  // ⭐ [메뉴 CRUD] 1. 기본 메뉴 세팅 (처음 1회용)
  const loadDefaultMenus = async () => {
    const defaultMenus = [
      { name: "시그니처 아메리카노", price: 2000, category: "coffee", isSoldOut: false },
      { name: "바닐라 딜라이트", price: 3800, category: "coffee", isSoldOut: false },
      { name: "제주 한라봉 에이드", price: 4200, category: "beverage", isSoldOut: false },
      { name: "플레인 크로플", price: 3000, category: "dessert", isSoldOut: false },
    ];
    defaultMenus.forEach(async (menu) => {
      await addDoc(collection(db, "cafe_menus"), { ...menu, createdAt: Date.now() });
    });
  };

  // ⭐ [메뉴 CRUD] 2. 메뉴 추가
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newMenu.name || !newMenu.price) return alert("이름과 가격을 입력해주세요!");
    await addDoc(collection(db, "cafe_menus"), {
      name: newMenu.name,
      price: Number(newMenu.price),
      category: newMenu.category,
      isSoldOut: false,
      createdAt: Date.now()
    });
    setNewMenu({ name: '', price: '', category: 'coffee' }); // 폼 초기화
    alert("새로운 메뉴가 등록되었습니다!");
  };

  // ⭐ [메뉴 CRUD] 3. 품절 상태 변경
  const toggleSoldOut = async (menuId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "cafe_menus", menuId), { isSoldOut: !currentStatus });
  };

  // ⭐ [메뉴 CRUD] 4. 메뉴 삭제
  const deleteMenu = async (menuId: string) => {
    if(!window.confirm("이 메뉴를 완전히 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "cafe_menus", menuId));
  };

  const waitingOrders = allOrders.filter(o => o.status === "waiting");
  const completedOrders = allOrders.filter(o => o.status === "completed");
  const totalRevenue = completedOrders.reduce((acc, order) => acc + order.totalPrice, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-[#224E48]">로컬커피 어드민 시스템 👨‍🍳</h1>
            {/* ⭐ 영업 마감 버튼 추가 */}
            <button onClick={handleCloseBusiness} className="bg-red-50 text-red-600 border border-red-200 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-colors">
              영업 마감 (데이터 초기화)
            </button>
          </div>
          
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-[#224E48] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>주문 현황판</button>
            <button onClick={() => setActiveTab('stats')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-[#224E48] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>매출 통계</button>
            <button onClick={() => setActiveTab('menus')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'menus' ? 'bg-[#D8B868] text-[#224E48]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>메뉴 관리 (CRUD)</button>
          </div>
        </div>
        {activeTab === 'orders' && (
          <div className="bg-[#F47373] text-white px-6 py-3 rounded-xl font-bold text-lg shadow-md animate-pulse">
            대기중인 주문: <span className="text-white text-2xl ml-1">{waitingOrders.length}</span>건
          </div>
        )}
      </header>

      {/* 1. 주문 현황판 탭 (유지) */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {waitingOrders.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 text-xl font-bold bg-white rounded-2xl border border-dashed border-gray-300">현재 대기 중인 주문이 없습니다.</div>
          ) : (
            waitingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-lg border-t-8 border-[#224E48] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <span className="font-black text-xl text-[#224E48]">주문번호 {order.orderNumber}</span>
                  <span className="text-sm font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">{order.time}</span>
                </div>
                <div className="p-5 flex-1 flex flex-col gap-4 bg-white">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg text-gray-800 leading-tight">{item.name}</p>
                        {item.options && <p className="text-sm text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-1 rounded-md">{item.options.temperature} / {item.options.size} {item.options.shot > 0 && `/ 샷 ${item.options.shot}추가`}</p>}
                      </div>
                      <span className="font-black text-xl text-white bg-[#D8B868] px-3 py-1 rounded-lg ml-2 shrink-0">{item.quantity}개</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => completeOrder(order.id)} className="w-full py-4 bg-[#224E48] hover:bg-[#1A3F3A] text-white font-black text-xl rounded-xl shadow-md transition-all active:scale-95">제조 완료</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. 매출 통계 탭 (유지) */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-[#D8B868]"><p className="text-gray-500 font-bold mb-2">오늘 총 매출</p><h2 className="text-4xl font-black text-gray-800">{totalRevenue.toLocaleString()}<span className="text-2xl ml-1">원</span></h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-[#224E48]"><p className="text-gray-500 font-bold mb-2">오늘 판매된 건수</p><h2 className="text-4xl font-black text-gray-800">{completedOrders.length}<span className="text-2xl ml-1">건</span></h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-[#F47373]"><p className="text-gray-500 font-bold mb-2">대기 중인 밀린 주문</p><h2 className="text-4xl font-black text-gray-800">{waitingOrders.length}<span className="text-2xl ml-1">건</span></h2></div>
          </div>
        </div>
      )}

      {/* ⭐ 3. 메뉴 관리 (CRUD) 탭 신규 추가 */}
      {activeTab === 'menus' && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-300">
          
          {/* 메뉴 리스트 영역 */}
          <div className="flex-[2] bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-2xl font-bold text-gray-800">📋 등록된 메뉴 목록</h3>
              {menus.length === 0 && (
                <button onClick={loadDefaultMenus} className="bg-[#D8B868] text-white px-4 py-2 rounded-lg font-bold hover:brightness-105">
                  기본 메뉴 세팅하기
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menus.map(menu => (
                <div key={menu.id} className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${menu.isSoldOut ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-[#224E48] bg-[#224E48]/10 px-2 py-1 rounded-md uppercase">{menu.category}</span>
                      {menu.isSoldOut && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-md">품절됨</span>}
                    </div>
                    <p className={`text-xl font-bold ${menu.isSoldOut ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{menu.name}</p>
                    <p className={`text-lg font-bold mt-1 ${menu.isSoldOut ? 'text-gray-400' : 'text-[#224E48]'}`}>{menu.price.toLocaleString()}원</p>
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200/50">
                    <button onClick={() => toggleSoldOut(menu.id, menu.isSoldOut)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${menu.isSoldOut ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                      {menu.isSoldOut ? '품절 해제' : '품절 처리'}
                    </button>
                    <button onClick={() => deleteMenu(menu.id)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-300">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 신규 메뉴 등록 폼 영역 */}
          <div className="flex-1 bg-[#224E48] p-6 rounded-2xl shadow-lg h-fit sticky top-8">
            <h3 className="text-2xl font-bold text-[#FAF5E8] mb-6">✨ 신규 메뉴 등록</h3>
            <form onSubmit={handleAddMenu} className="flex flex-col gap-4">
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">카테고리</label>
                <select value={newMenu.category} onChange={e => setNewMenu({...newMenu, category: e.target.value})} className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none">
                  <option value="coffee">커피 (Coffee)</option>
                  <option value="beverage">음료 (Beverage)</option>
                  <option value="tea">티 (Tea)</option>
                  <option value="dessert">디저트 (Dessert)</option>
                </select>
              </div>
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">메뉴 이름</label>
                <input type="text" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} placeholder="예) 달콤한 딸기 라떼" className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none placeholder:text-gray-400"/>
              </div>
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">가격 (원)</label>
                <input type="number" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} placeholder="예) 4500" className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none placeholder:text-gray-400"/>
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-[#D8B868] text-[#224E48] font-black text-xl rounded-xl shadow-md hover:brightness-110 transition-all active:scale-95">
                등록하기
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}