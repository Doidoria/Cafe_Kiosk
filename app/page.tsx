// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "../store/useCartStore";
import { collection, addDoc, getDocs, query, where, onSnapshot } from "firebase/firestore"; 
import { db } from "./firebase"; 

const categories = [
  { id: 'all', name: '전체' },
  { id: 'coffee', name: '커피' },
  { id: 'beverage', name: '음료' },
  { id: 'tea', name: '티' },
  { id: 'dessert', name: '디저트/스낵' },
];

export default function Home() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCartStore();
  
  // ⭐ 파이어베이스에서 불러올 메뉴 상태
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const [temp, setTemp] = useState<'HOT' | 'ICE'>('ICE');
  const [size, setSize] = useState<'Regular' | 'Large'>('Regular');
  const [shot, setShot] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1); 

  const [isPaying, setIsPaying] = useState(false); 
  const [receipt, setReceipt] = useState<any>(null);

  // ⭐ 파이어베이스 메뉴 실시간 연동
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cafe_menus"), (snapshot) => {
      const menus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 등록된 시간순 정렬
      menus.sort((a: any, b: any) => a.createdAt - b.createdAt);
      setMenuItems(menus);
    });
    return () => unsub();
  }, []);

  const handleMenuClick = (item: any) => {
    if (item.isSoldOut) return; // 품절 메뉴는 클릭 방지
    
    setTemp('ICE'); setSize('Regular'); setShot(0); setQuantity(1); 
    if (item.category === 'dessert') {
      setSelectedMenu({ ...item, isDessert: true }); 
      return;
    }
    setSelectedMenu(item);
  };

  const handleAddToCart = () => {
    const optionPrice = selectedMenu.isDessert ? 0 : (size === 'Large' ? 500 : 0) + (shot * 500);
    const finalPrice = selectedMenu.price + optionPrice;
    const uniqueCartId = selectedMenu.isDessert 
      ? `${selectedMenu.id}-default`
      : `${selectedMenu.id}-${temp}-${size}-${shot}`;

    addToCart({
      cartItemId: uniqueCartId, id: selectedMenu.id, name: selectedMenu.name, price: finalPrice, 
      quantity: quantity,
      options: selectedMenu.isDessert ? undefined : { temperature: temp, size: size, shot: shot }
    });
    setSelectedMenu(null); 
  };

  const handleCheckout = async () => {
    if(cart.length === 0) return alert('메뉴를 먼저 담아주세요!');
    setIsPaying(true); 
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
      const q = query(collection(db, "cafe_orders"), where("date", "==", dateStr));
      const querySnapshot = await getDocs(q);
      const orderNumber = querySnapshot.size + 1; 

      const orderData = {
        orderNumber, 
        items: cart,
        totalPrice: totalPrice,
        status: "waiting", 
        createdAt: now.toISOString(), 
        date: dateStr,
        time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      };

      await addDoc(collection(db, "cafe_orders"), orderData);
      setReceipt(orderData);
      clearCart(); 
      setTimeout(() => setReceipt(null), 5000);

    } catch (error) {
      alert("결제 처리 중 문제가 발생했습니다.");
    } finally {
      setIsPaying(false); 
    }
  };

  const filteredMenuItems = activeCategory === 'all' ? menuItems : menuItems.filter(item => item.category === activeCategory);

  return (
    <main className="flex w-full h-screen bg-[#FAF5E8] text-[#333] font-sans relative overflow-hidden">
      
      {/* ==============================
          왼쪽: 메뉴판 영역
      ============================== */}
      <div className="flex-1 flex flex-col h-full">
        <header className="w-full bg-[#224E48] p-5 flex items-center justify-between shadow-md border-b-2 border-[#D8B868]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D8B868] flex items-center justify-center font-bold text-[#224E48] text-xl">로</div>
            <h1 className="text-3xl font-bold text-[#FAF5E8] tracking-tighter">로컬커피 <span className="text-[16px] text-[#D8B868]/80 font-medium">LOCAL COFFEE</span></h1>
          </div>
        </header>

        <nav className="w-full bg-white p-3 shadow-sm border-b border-gray-100 flex gap-2 z-10">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${activeCategory === cat.id ? 'bg-[#224E48] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {cat.name}
            </button>
          ))}
        </nav>
        
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
          {/* ⭐ 데이터가 없을 때 표시할 UI */}
          {menuItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-xl font-bold mb-2">메뉴를 불러오는 중이거나 등록된 메뉴가 없습니다.</p>
              <p className="text-sm">어드민 페이지의 '메뉴 관리' 탭에서 기본 메뉴를 세팅해주세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenuItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleMenuClick(item)} 
                  disabled={item.isSoldOut} // 품절 시 클릭 방지
                  className={`bg-white p-5 rounded-2xl shadow-sm transition-all flex flex-col border group relative overflow-hidden
                    ${item.isSoldOut ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale' : 'border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:border-[#D8B868] active:scale-95'}`}
                >
                  {/* 품절 도장 오버레이 */}
                  {item.isSoldOut && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                      <div className="border-4 border-red-500 text-red-500 font-black text-2xl px-4 py-2 rounded-lg -rotate-12 tracking-widest bg-white/80">SOLD OUT</div>
                    </div>
                  )}

                  <div className="w-full h-36 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-400 text-sm border border-gray-100">이미지</div>
                  <div className="flex flex-col items-start w-full">
                    <h2 className={`text-xl font-bold tracking-tight ${item.isSoldOut ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.name}</h2>
                    <div className="w-full border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
                      <p className={`text-xl font-black ${item.isSoldOut ? 'text-gray-500' : 'text-[#224E48]'}`}>{item.price.toLocaleString()}원</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==============================
          오른쪽: 장바구니 영역 (기존과 동일)
      ============================== */}
      <div className="w-[380px] bg-white border-l-2 border-[#D8B868]/20 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🛒 주문 내역</h2>
          {cart.length > 0 && <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 font-medium">전체삭제</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 mt-10">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4 text-4xl">☕</div>
              <p className="font-bold text-xl">장바구니가 비었습니다.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="flex flex-col bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                <button onClick={() => removeFromCart(item.cartItemId)} className="absolute -top-2 -right-2 w-7 h-7 bg-[#FAF5E8] border-2 border-gray-100 text-red-500 rounded-full flex items-center justify-center font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-[17px] text-gray-800">{item.name}</p>
                    {item.options && (
                      <p className="text-[13px] text-gray-600 mt-1 bg-white px-2 py-1 rounded-md border border-gray-100 inline-block font-medium">
                        {item.options.temperature} / {item.options.size} {item.options.shot > 0 && ` / 샷 ${item.options.shot}추가`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1 border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-inner">
                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 bg-gray-100 rounded text-gray-600 font-bold hover:bg-gray-200">-</button>
                    <span className="font-bold w-4 text-center text-[#224E48]">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 bg-[#D8B868]/30 rounded text-[#224E48] font-bold hover:bg-[#D8B868]/50">+</button>
                  </div>
                  <span className="font-black text-xl text-[#224E48]">{(item.price * item.quantity).toLocaleString()}원</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white shadow-inner">
          <div className="flex justify-between items-center mb-5 bg-[#FAF5E8] p-4 rounded-xl border border-[#D8B868]/30">
            <span className="text-lg font-semibold text-[#224E48]">총 결제 금액</span>
            <span className="text-3xl font-black text-[#224E48]">{totalPrice.toLocaleString()}원</span>
          </div>
          <div className="flex gap-3">
            <button onClick={clearCart} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 active:scale-95 text-lg">초기화</button>
            <button onClick={handleCheckout} disabled={isPaying} className="flex-[2.5] py-4 bg-[#224E48] text-[#FAF5E8] font-black rounded-xl shadow-lg hover:bg-[#1A3F3A] active:scale-95 text-xl tracking-wide disabled:opacity-70">
              {isPaying ? '처리중...' : '주문완료'}
            </button>
          </div>
        </div>
      </div>

      {/* 모달창 (기존과 동일) */}
      {selectedMenu && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[450px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 border-4 border-[#D8B868]">
            <div className="bg-[#224E48] p-6 flex justify-between items-center border-b-2 border-[#D8B868]/30">
              <h3 className="text-2xl font-bold text-[#FAF5E8]">{selectedMenu.name} <span className="text-sm text-[#FAF5E8]/80">옵션</span></h3>
              <button onClick={() => setSelectedMenu(null)} className="text-[#D8B868] font-bold text-3xl hover:scale-110">×</button>
            </div>
            
            <div className="p-7 flex flex-col gap-6 bg-gray-50/50">
              {!selectedMenu.isDessert && (
                <>
                  <div>
                    <p className="font-bold text-gray-800 mb-3 text-lg">온도</p>
                    <div className="flex gap-3">
                      <button onClick={() => setTemp('ICE')} className={`flex-1 py-4 font-bold rounded-2xl border-4 transition-all text-xl ${temp === 'ICE' ? 'border-[#D8B868] bg-[#D8B868]/10 text-[#224E48]' : 'border-gray-200 bg-white text-gray-400'}`}>🧊 ICE</button>
                      <button onClick={() => setTemp('HOT')} className={`flex-1 py-4 font-bold rounded-2xl border-4 transition-all text-xl ${temp === 'HOT' ? 'border-[#F47373] bg-[#F47373]/10 text-red-600' : 'border-gray-200 bg-white text-gray-400'}`}>🔥 HOT</button>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 mb-3 text-lg">사이즈</p>
                    <div className="flex gap-3">
                      <button onClick={() => setSize('Regular')} className={`flex-1 py-4 font-bold rounded-2xl border-4 transition-all text-xl ${size === 'Regular' ? 'border-[#224E48] bg-[#224E48]/5 text-[#224E48]' : 'border-gray-200 bg-white text-gray-400'}`}>Regular</button>
                      <button onClick={() => setSize('Large')} className={`flex-1 py-4 font-bold rounded-2xl border-4 transition-all text-xl ${size === 'Large' ? 'border-[#224E48] bg-[#224E48]/5 text-[#224E48]' : 'border-gray-200 bg-white text-gray-400'}`}>Large (+500원)</button>
                    </div>
                  </div>
                  {selectedMenu.category === 'coffee' && (
                    <div>
                      <p className="font-bold text-gray-800 mb-3 text-lg">샷 추가</p>
                      <div className="flex items-center gap-5 bg-white p-3 rounded-2xl border border-gray-100 inline-flex shadow-inner">
                        <button onClick={() => setShot(Math.max(0, shot - 1))} className="w-12 h-12 rounded-full bg-gray-100 font-bold text-3xl text-gray-500">-</button>
                        <span className="text-3xl font-black w-8 text-center text-[#224E48]">{shot}</span>
                        <button onClick={() => setShot(shot + 1)} className="w-12 h-12 rounded-full bg-[#D8B868] font-bold text-3xl text-[#224E48]">+</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="pt-4 border-t border-gray-200">
                <p className="font-bold text-gray-800 mb-3 text-lg">수량</p>
                <div className="flex items-center gap-5 bg-white p-3 rounded-2xl border border-gray-100 inline-flex shadow-inner">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-full bg-gray-100 font-bold text-3xl text-gray-500">-</button>
                  <span className="text-3xl font-black w-8 text-center text-[#224E48]">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-full bg-[#D8B868] font-bold text-3xl text-[#224E48]">+</button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white shadow-inner">
              <button onClick={handleAddToCart} className="w-full py-5 bg-[#224E48] text-[#FAF5E8] font-black rounded-2xl shadow-xl transition-all active:scale-95 text-2xl tracking-wide">
                {((selectedMenu.price + (selectedMenu.isDessert ? 0 : (size === 'Large' ? 500 : 0) + (shot * 500))) * quantity).toLocaleString()}원 담기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 영수증 팝업 (기존과 동일) */}
      {receipt && (
        <div className="absolute inset-0 bg-[#224E48]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-t-3xl rounded-b-lg w-full max-w-[400px] shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="absolute bottom-0 w-full h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMCI+PHBvbHlnb24gZmlsbD0iIzIyNEU0OCIgcG9pbnRzPSIwLDEwIDYsMCAxMiwxMCAiLz48L3N2Zz4=')] bg-repeat-x opacity-10"></div>
            <div className="p-8 flex flex-col items-center border-b-2 border-dashed border-gray-300">
              <div className="w-16 h-16 bg-[#D8B868] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">✓</div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">결제가 완료되었습니다</h2>
              <p className="text-gray-500 font-medium">카드를 뽑아주세요</p>
            </div>
            <div className="p-8 flex flex-col bg-gray-50 flex-1">
              <p className="text-center font-bold text-gray-500 mb-2">대기번호</p>
              <p className="text-center text-7xl font-black text-[#224E48] mb-8 tracking-tighter">{receipt.orderNumber}</p>
              <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center mb-6">
                <span className="font-bold text-gray-600">결제 금액</span>
                <span className="text-2xl font-black text-gray-800">{receipt.totalPrice.toLocaleString()}원</span>
              </div>
              <button onClick={() => setReceipt(null)} className="w-full py-4 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                돌아가기 (5초 뒤 자동닫힘)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}