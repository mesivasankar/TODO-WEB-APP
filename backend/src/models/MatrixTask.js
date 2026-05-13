// Example using Sequelize
module.exports = (sequelize, DataTypes) => {
  const MatrixTask = sequelize.define("MatrixTask", {
    text: { type: DataTypes.STRING, allowNull: false },
    quadrant: { 
      type: DataTypes.INTEGER, // 1, 2, 3, or 4
      allowNull: false 
    },
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false }
  });
  return MatrixTask;
};