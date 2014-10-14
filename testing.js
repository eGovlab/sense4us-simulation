var arr = [];
var obj = {x: 10};

arr.push(obj);

obj.x = 15;

console.log(arr[0]);
