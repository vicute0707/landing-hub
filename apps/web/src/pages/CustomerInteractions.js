// import React, { useState, useEffect } from 'react';
// import '../styles/CustomerInteractions.css'; // File CSS bạn sẽ cần tạo

// const mockInteractions = [
//   { id: 1, name: 'Khách hàng A', message: 'Chào bạn, tôi muốn hỏi về dự án căn hộ Quận 7', time: '10:30 AM - 17/09/2025' },
//   { id: 2, name: 'Khách hàng B', message: 'Giá bán của căn 2 phòng ngủ là bao nhiêu?', time: '09:45 AM - 17/09/2025' },
//   { id: 3, name: 'Khách hàng C', message: 'Tôi có thể xem nhà mẫu vào cuối tuần được không?', time: '08:15 AM - 17/09/2025' },
// ];

// const CustomerInteractionsPage = () => {
//   const [interactions, setInteractions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setInteractions(mockInteractions);
//       setLoading(false);
//     }, 1000);
//     return () => clearTimeout(timer);
//   }, []);

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
//       <h2 className="page-title">Tương tác Khách hàng</h2>
//       <p className="page-subtitle">
//         Quản lý các tương tác đến từ Zalo chatbot của bạn.
//       </p>
//       <div className="interactions-list-container">
//         {interactions.length > 0 ? (
//           <ul className="interactions-list">
//             {interactions.map((interaction) => (
//               <li className="interaction-item" key={interaction.id}>
//                 <div className="interaction-header">
//                   <span className="customer-name">{interaction.name}</span>
//                   <span className="interaction-time">{interaction.time}</span>
//                 </div>
//                 <p className="interaction-message">{interaction.message}</p>
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <p className="no-interaction-message">
//             Chưa có tương tác nào từ Zalo chatbot.
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CustomerInteractionsPage;