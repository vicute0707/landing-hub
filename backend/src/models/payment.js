// sử dụng Knex hoặc Sequelize, ví dụ Knex
import db from "../db.js";

export const createPayment = (payment) => {
  return db("payments").insert(payment);
};

export const updatePaymentStatus = (payment_id, status) => {
  return db("payments")
    .where({ payment_id })
    .update({ status, updated_at: new Date() });
};

export const getPayment = (payment_id) => {
  return db("payments").where({ payment_id }).first();
};
