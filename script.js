// 页面加载完成后绑定按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn");
  const msg = document.getElementById("msg");
  let count = 0;

  btn.addEventListener("click", () => {
    count++;
    msg.textContent = `笨蛋黄嘉琳已经点了 ${count} 次 🎉`;
  });
});
