// Dummy Expense Controller
const Expense = require('../services/expenseModel');

// In-memory array for demo expenses
const dummyExpenses = [
  new Expense('exp_1', 1200, 'Compliance Certification', new Date(), 'IEC license registration charges'),
  new Expense('exp_2', 4500, 'Ocean Freight Logistics', new Date(), 'Port of Nhava Sheva handling fees')
];

exports.getExpenses = (req, res) => {
  res.status(200).json(dummyExpenses);
};

exports.createExpense = (req, res) => {
  const { amount, category, description } = req.body;
  const newExpense = new Expense(
    `exp_${Date.now()}`,
    amount,
    category,
    new Date(),
    description
  );
  dummyExpenses.push(newExpense);
  res.status(201).json({
    message: 'Expense added successfully',
    expense: newExpense
  });
};
