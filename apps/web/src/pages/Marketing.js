// import React, { useState } from 'react';
// import '../styles/Marketing.css'; // File CSS bạn sẽ cần tạo

// const MarketingPage = () => {
//   const [emailSubject, setEmailSubject] = useState('');
//   const [emailBody, setEmailBody] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [alert, setAlert] = useState(null);

//   const handleSendEmail = async () => {
//     if (!emailSubject || !emailBody) {
//       setAlert({ type: 'error', message: 'Vui lòng điền đầy đủ tiêu đề và nội dung email.' });
//       return;
//     }

//     setLoading(true);
//     try {
//       // Giả lập việc gọi API
//       const result = { success: true };

//       if (result.success) {
//         setAlert({ type: 'success', message: 'Chiến dịch email đã được gửi thành công!' });
//         setEmailSubject('');
//         setEmailBody('');
//       } else {
//         setAlert({ type: 'error', message: 'Có lỗi xảy ra, vui lòng thử lại.' });
//       }
//     } catch (error) {
//       setAlert({ type: 'error', message: 'Đã xảy ra lỗi, không thể gửi email.' });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="page-container">
//       <h2 className="page-title">Quảng cáo & Marketing</h2>
//       <div className="marketing-form-container">
//         <h3 className="form-title">Gửi Email quảng cáo</h3>
//         <p className="form-subtitle">
//           Bạn có thể tạo và gửi các chiến dịch email marketing đến danh sách khách hàng tiềm năng.
//         </p>
        
//         {alert && (
//           <div className={`alert ${alert.type}`}>
//             {alert.message}
//           </div>
//         )}

//         <div className="form-group">
//           <label htmlFor="subject">Tiêu đề email</label>
//           <input
//             id="subject"
//             type="text"
//             className="input-field"
//             value={emailSubject}
//             onChange={(e) => setEmailSubject(e.target.value)}
//           />
//         </div>
        
//         <div className="form-group">
//           <label htmlFor="body">Nội dung email</label>
//           <textarea
//             id="body"
//             className="textarea-field"
//             rows="8"
//             value={emailBody}
//             onChange={(e) => setEmailBody(e.target.value)}
//           ></textarea>
//         </div>

//         <button 
//           className="send-button"
//           onClick={handleSendEmail}
//           disabled={loading}
//         >
//           {loading ? 'Đang gửi...' : 'Gửi chiến dịch'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default MarketingPage;