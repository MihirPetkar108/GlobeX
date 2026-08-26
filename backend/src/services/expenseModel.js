// Dummy Expense Model
// Represents expense records in the application

class Expense {
  constructor(id, amount, category, date, description) {
    this.id = id;
    this.amount = amount;
    this.category = category;
    this.date = date;
    this.description = description;
  }
}

module.exports = Expense;
