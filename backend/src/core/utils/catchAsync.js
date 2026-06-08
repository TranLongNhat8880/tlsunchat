// Bọc hàm async để loại bỏ việc phải viết try-catch ở mọi controller
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
