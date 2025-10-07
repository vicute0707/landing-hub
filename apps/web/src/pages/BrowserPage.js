// // src/pages/Browser.jsx
// import React, { useEffect, useState } from 'react';
// import api from '../services/api';
// import { useNavigate } from 'react-router-dom';

// const BrowserPage = () => {
//   const [landings, setLandings] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     api.get('/user/landings')
//       .then(res => setLandings(res.data))
//       .catch(err => console.error(err));
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Navbar */}
//       <header className="bg-white shadow p-4 flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-blue-600">LandingHub Marketplace</h1>
//         <button
//           className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
//           onClick={() => navigate('/dashboard')}
//         >
//           Back to Dashboard
//         </button>
//       </header>

//       {/* Hero */}
//       <section className="text-center py-10">
//         <h2 className="text-3xl font-bold mb-2">Your Landing Pages</h2>
//         <p className="text-gray-600">Browse and manage your landing pages in one place</p>
//       </section>

//       {/* Grid Marketplace */}
//       <main className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
//         {landings.map(landing => (
//           <div
//             key={landing.id}
//             className="bg-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition overflow-hidden"
//           >
//             <img
//               src={landing.thumbnail || 'https://via.placeholder.com/300x160'}
//               alt={landing.title}
//               className="w-full h-40 object-cover"
//             />
//             <div className="p-4">
//               <h3 className="text-lg font-bold mb-2">{landing.title}</h3>
//               <p className="text-gray-500 mb-4 line-clamp-2">{landing.description}</p>
//               <button
//                 className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
//                 onClick={() => navigate(`/editor/${landing.id}`)}
//               >
//                 Edit
//               </button>
//             </div>
//           </div>
//         ))}
//       </main>

//       {/* Footer */}
//       <footer className="bg-white text-center py-4 text-gray-500">
//         © 2025 LandingHub Iconic
//       </footer>
//     </div>
//   );
// };

// export default BrowserPage;
