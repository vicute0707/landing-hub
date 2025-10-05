// import React, { useState, useEffect } from 'react';
// import '../styles/Template.css'; // File CSS bạn sẽ cần tạo

// // Giả lập dữ liệu
// const mockTemplates = [
//   {
//     id: 1,
//     name: 'Căn hộ Quận 7',
//     description: 'Mẫu landing page hiện đại, tối ưu cho dự án căn hộ.',
//     price: 350000,
//     category: 'Căn hộ',
//     image: 'https://via.placeholder.com/400x300.png?text=Apartment+Template',
//   },
//   {
//     id: 2,
//     name: 'Biệt thự cao cấp',
//     description: 'Thiết kế sang trọng, phù hợp cho biệt thự hoặc nhà phố.',
//     price: 500000,
//     category: 'Biệt thự',
//     image: 'https://via.placeholder.com/400x300.png?text=Villa+Template',
//   },
//   {
//     id: 3,
//     name: 'Nhà phố mới xây',
//     description: 'Mẫu đơn giản, tập trung vào hình ảnh và thông tin dự án.',
//     price: 200000,
//     category: 'Nhà phố',
//     image: 'https://via.placeholder.com/400x300.png?text=Townhouse+Template',
//   },
// ];

// const TemplatesPage = () => {
//   const [templates, setTemplates] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setTemplates(mockTemplates);
//       setLoading(false);
//     }, 1000);
//     return () => clearTimeout(timer);
//   }, []);

//   const handleBuyTemplate = (template) => {
//     alert(`Bạn đã chọn mua mẫu "${template.name}". Chức năng thanh toán sẽ được xử lý tại đây.`);
//   };

//   if (loading) {
//     return (
//       <div className="loading-container">
//         <div className="spinner"></div>
//         <p>Đang tải...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="page-container">
//       <h2 className="page-title">Thư viện mẫu Landing Page</h2>
//       <p className="page-subtitle">
//         Chọn một trong các mẫu thiết kế chuyên nghiệp hoặc đăng ký gói Premium để sử dụng không giới hạn.
//       </p>
//       <div className="template-grid">
//         {templates.map((template) => (
//           <div className="template-card" key={template.id}>
//             <img className="template-image" src={template.image} alt={template.name} />
//             <div className="card-content">
//               <h3 className="template-name">{template.name}</h3>
//               <span className="template-category">{template.category}</span>
//               <p className="template-description">{template.description}</p>
//               <div className="card-footer">
//                 <span className="template-price">
//                   {template.price.toLocaleString('vi-VN')} VNĐ
//                 </span>
//                 <button className="buy-button" onClick={() => handleBuyTemplate(template)}>
//                   Mua ngay
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default TemplatesPage;