// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { leadsAPI } from '../services/api';
// import styled from 'styled-components';

// const Wrapper = styled.div`
//   background-color: #f6f8fb;
//   padding: 40px 20px;
//   display: flex;
//   justify-content: center;
// `;

// const Form = styled.form`
//   background-color: #fff;
//   padding: 32px;
//   border-radius: 16px;
//   max-width: 480px;
//   width: 100%;
//   box-shadow: 0 8px 24px rgba(0,0,0,0.08);
//   display: flex;
//   flex-direction: column;
//   gap: 18px;
//   transition: transform 0.2s, box-shadow 0.2s;

//   &:hover {
//     transform: translateY(-2px);
//     box-shadow: 0 12px 36px rgba(0,0,0,0.12);
//   }
// `;

// const Input = styled.input`
//   padding: 12px 14px;
//   border-radius: 12px;
//   border: 1px solid #d1d5db;
//   font-size: 15px;
//   width: 100%;
//   box-sizing: border-box;
//   background-color: #fefefe;
//   transition: all 0.2s ease-in-out;

//   &:focus {
//     outline: none;
//     border-color: #3b82f6;
//     box-shadow: 0 0 0 4px rgba(59,130,246,0.15);
//     background-color: #fff;
//   }
// `;

// const Button = styled.button`
//   padding: 14px;
//   background-color: #3b82f6;
//   color: #fff;
//   font-size: 16px;
//   font-weight: 600;
//   border: none;
//   border-radius: 12px;
//   cursor: pointer;
//   transition: all 0.2s;

//   &:hover {
//     background-color: #2563eb;
//     transform: translateY(-1px);
//     box-shadow: 0 6px 14px rgba(59,130,246,0.25);
//   }
// `;

// const LandingForm = () => {
//   const { register, handleSubmit, formState: { errors }, reset } = useForm();

//   const onSubmit = async (data) => {
//     try {
//       await leadsAPI.createLead(data);
//       alert('Cảm ơn! Lead của bạn đã được gửi.');
//       reset();
//     } catch (error) {
//       alert('Lỗi: ' + error.response?.data?.error || error.message);
//     }
//   };

//   return (
//     <Wrapper>
//       <Form onSubmit={handleSubmit(onSubmit)}>
//         <h2 style={{textAlign:'center', fontSize:22, fontWeight:600}}>📩 Gửi thông tin của bạn</h2>

//         <Input {...register('name', { required: 'Tên là bắt buộc' })} placeholder="Tên của bạn" />
//         {errors.name && <p style={{color:'#f87171', fontSize:12}}>{errors.name.message}</p>}

//         <Input {...register('email', { required:'Email là bắt buộc', pattern:{value:/^\S+@\S+$/i,message:'Email không hợp lệ'} })} placeholder="Email" type="email"/>
//         {errors.email && <p style={{color:'#f87171', fontSize:12}}>{errors.email.message}</p>}

//         <Input {...register('phone', { required: 'Số điện thoại là bắt buộc' })} placeholder="Số điện thoại" type="tel"/>
//         {errors.phone && <p style={{color:'#f87171', fontSize:12}}>{errors.phone.message}</p>}

//         <Input {...register('company')} placeholder="Công ty"/>
//         <Input {...register('position')} placeholder="Vị trí công việc"/>

//         <Button type="submit">Gửi Leads</Button>
//       </Form>
//     </Wrapper>
//   );
// };

// export default LandingForm;
