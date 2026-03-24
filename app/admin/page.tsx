// app/admin/page.tsx
"use client";

import { useState, useEffect, useRef } from "react"; // useRef 추가
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // ⭐ 스토리지 함수들 추가
import { db, storage } from "../firebase"; // ⭐ storage 불러오기 추가
import { v4 as uuidv4 } from 'uuid'; // ⭐ 고유 ID 생성 라이브러리

export default function AdminPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]); 
  const [activeTab, setActiveTab] = useState<'orders' | 'stats' | 'menus'>('orders');

  // 신규 메뉴 등록용 상태 (imageUrl 추가)
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'coffee', imageUrl: '' });
  
  // ⭐ 이미지 파일 상태 및 프리뷰용 상태 추가
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // ⭐ 등록 중 로딩 상태 추가
  const [isUploading, setIsUploading] = useState(false);

  // 파일 입력란 리셋을 위한 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // ... (주문 및 메뉴 실시간 연동 로직은 그대로 유지)
    const unsubOrders = onSnapshot(collection(db, "cafe_orders"), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      orders.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setAllOrders(orders);
    });
    const unsubMenus = onSnapshot(collection(db, "cafe_menus"), (snapshot) => {
      const fetchedMenus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenus(fetchedMenus);
    });
    return () => { unsubOrders(); unsubMenus(); };
  }, []);

  // ... (주문 완료, 영업 마감 함수는 그대로 유지)
  const completeOrder = async (orderId: string) => {
    await updateDoc(doc(db, "cafe_orders", orderId), { status: "completed" });
  };
  const handleCloseBusiness = async () => {
    if (!window.confirm("🚨 정말 영업을 마감하시겠습니까? 오늘 주문 데이터가 삭제됩니다.")) return;
    try {
      const snapshot = await getDocs(collection(db, "cafe_orders"));
      const promises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      alert("영업 마감 처리가 완료되었습니다.");
    } catch (error) { alert("초기화 중 오류가 발생했습니다."); }
  };


  // ⭐ 파일 선택 시 프리뷰 보여주는 함수
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // 파일을 읽어서 프리뷰 URL 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ⭐ [메뉴 CRUD] 2. 메뉴 추가 (이미지 업로드 로직 포함)
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newMenu.name || !newMenu.price) return alert("이름과 가격을 입력해주세요!");
    if(!imageFile) return alert("메뉴 이미지를 등록해주세요!"); // 이미지 필수

    setIsUploading(true); // 로딩 시작

    try {
      // 1. ⭐ 파이어베이스 스토리지에 이미지 업로드
      // 파일 이름 고유하게 만들기 (uploads/폴더안에 uuid_파일명 형식)
      const fileName = `uploads/${uuidv4()}_${imageFile.name}`;
      const storageRef = ref(storage, fileName);
      
      // 이미지 업로드 실행
      const snapshot = await uploadBytes(storageRef, imageFile);
      
      // 2. ⭐ 업로드된 이미지의 다운로드 URL 따기
      const imageUrl = await getDownloadURL(snapshot.ref);

      // 3. ⭐ 다운로드 URL을 포함해서 Firestore에 메뉴 등록
      await addDoc(collection(db, "cafe_menus"), {
        name: newMenu.name,
        price: Number(newMenu.price),
        category: newMenu.category,
        imageUrl: imageUrl, // ⭐ 이미지 URL 저장
        isSoldOut: false,
        createdAt: Date.now()
      });

      // 폼 및 상태 초기화
      setNewMenu({ name: '', price: '', category: 'coffee', imageUrl: '' });
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // 파일 입력란 초기화

      alert("새로운 메뉴가 이미지가 함께 등록되었습니다!");
    } catch (error) {
      console.error("메뉴 등록 에러:", error);
      alert("메뉴 등록 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false); // 로딩 끝
    }
  };

  // ... (품절 처리, 메뉴 삭제 함수는 그대로 유지)
  const toggleSoldOut = async (menuId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "cafe_menus", menuId), { isSoldOut: !currentStatus });
  };
  const deleteMenu = async (menuId: string) => {
    if(!window.confirm("이 메뉴를 완전히 삭제하시겠습니까?")) return;
    // 💡 팁: 실제 서비스에서는 스토리지에 있는 이미지 파일도 같이 삭제해주는게 좋습니다!
    await deleteDoc(doc(db, "cafe_menus", menuId));
  };


  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-[#224E48]">로컬커피 어드민 시스템 👨‍🍳</h1>
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
      </header>

      {/* 1, 2 탭 영역은 그대로 유지... */}
      {activeTab === 'orders' && ( /* ... */ <></>)}
      {activeTab === 'stats' && ( /* ... */ <></>)}


      {/* 3. 메뉴 관리 (CRUD) 탭 */}
      {activeTab === 'menus' && (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-300">
          
          {/* 메뉴 리스트 영역 */}
          <div className="flex-[2] bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">📋 등록된 메뉴 목록</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menus.map(menu => (
                <div key={menu.id} className={`p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${menu.isSoldOut ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50'}`}>
                  
                  {/* ⭐ 등록된 메뉴 이미지 보여주기 */}
                  <div className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                    {menu.imageUrl ? (
                      <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">NO IMG</div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-[#224E48] bg-[#224E48]/10 px-2 py-1 rounded-md uppercase">{menu.category}</span>
                        {menu.isSoldOut && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-md">품절됨</span>}
                      </div>
                      <p className={`text-xl font-bold ${menu.isSoldOut ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{menu.name}</p>
                      <p className={`text-lg font-bold mt-1 ${menu.isSoldOut ? 'text-gray-400' : 'text-[#224E48]'}`}>{menu.price.toLocaleString()}원</p>
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200/50">
                      <button onClick={() => toggleSoldOut(menu.id, menu.isSoldOut)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${menu.isSoldOut ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                        {menu.isSoldOut ? '품절 해제' : '품절 처리'}
                      </button>
                      <button onClick={() => deleteMenu(menu.id)} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-300">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 신규 메뉴 등록 폼 영역 */}
          <div className="flex-1 bg-[#224E48] p-6 rounded-2xl shadow-lg h-fit sticky top-8 z-10">
            <h3 className="text-2xl font-bold text-[#FAF5E8] mb-6">✨ 신규 메뉴 등록</h3>
            <form onSubmit={handleAddMenu} className="flex flex-col gap-4">
              
              {/* ⭐ 이미지 업로드 입력란 추가 */}
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">메뉴 이미지 (필수)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="w-full text-sm text-[#FAF5E8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FAF5E8] file:text-[#224E48] hover:file:bg-[#D8B868]"
                />
                {/* ⭐ 이미지 프리뷰 영역 */}
                {imagePreview && (
                  <div className="mt-3 w-32 h-32 rounded-lg bg-gray-100 overflow-hidden border-2 border-[#D8B868] shadow-inner">
                    <img src={imagePreview} alt="프리뷰" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">카테고리</label>
                <select value={newMenu.category} onChange={e => setNewMenu({...newMenu, category: e.target.value})} className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none">
                  <option value="coffee">커피</option><option value="beverage">음료</option><option value="tea">티</option><option value="dessert">디저트</option>
                </select>
              </div>
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">메뉴 이름</label>
                <input type="text" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} placeholder="예) 딸기 스무디" className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none"/>
              </div>
              <div>
                <label className="text-[#D8B868] font-bold text-sm mb-1 block">가격 (원)</label>
                <input type="number" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} placeholder="예) 4500" className="w-full p-3 rounded-xl bg-white text-gray-800 font-bold outline-none"/>
              </div>
              
              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full py-4 mt-2 bg-[#D8B868] text-[#224E48] font-black text-xl rounded-xl shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {isUploading ? '이미지 업로드 중...' : '새 메뉴 등록하기'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}