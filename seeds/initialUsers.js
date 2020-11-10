
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        {id: 1, name: 'adrian', username:'adrian123',email: 'adrian@gmail.com', password: '123456', rating: 0, get_rated: 0},
        {id: 2, name: 'hilman', username:'hilman123', email: 'hilman@gmail.com', password: '123456', rating: 0, get_rated: 0},
        {id: 3, name: 'admin', username:'admin123',email: 'admin@gmail.com', password: '123456', rating: 0, get_rated: 0}
      ]);
    });
};
