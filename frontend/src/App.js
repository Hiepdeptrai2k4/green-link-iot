import logo from './logo.svg';
import './App.css';

function App() {
  return (
    // bg-green-100: Nền màu xanh lá nhạt
    // h-screen: Full chiều cao màn hình
    // flex items-center justify-center: Căn giữa nội dung tuyệt đối
    <div className="min-h-screen bg-green-100 flex items-center justify-center p-5">
      
      {/* shadow-2xl: Đổ bóng đậm chuyên nghiệp
          rounded-3xl: Bo góc tròn cực mạnh
          border-b-8 border-green-600: Thanh viền đậm dưới đáy nút */}
      <div className="bg-white p-10 rounded-3xl shadow-2xl text-center border-b-8 border-green-600">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
          Green Link <span className="text-green-600">IOT</span>
        </h1>
        
        <p className="text-gray-600 text-lg mb-6">
          Nếu Hiệp thấy khung này có <span className="font-bold text-green-500">viền xanh</span> và <span className="font-bold text-green-500">bo góc tròn</span>, 
          thì Tailwind đã chạy thành công!
        </p>

        {/* hover:scale-105: Hiệu ứng phóng to khi di chuột vào */}
        <button className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 hover:scale-105 transition-all duration-300">
          Sẵn sàng cho Tuần 2!
        </button>
      </div>
    </div>
  );
}

export default App;
