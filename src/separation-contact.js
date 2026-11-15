// Conservative axis-aligned visual bounds, not a structural collision solver.
// Return the minimum displacement needed to move the second box clear.
export function boxClearance(a,b,margin=.2){
  const axes=['x','y','z'];
  if(axes.some(k=>a.max[k]<=b.min[k]||b.max[k]<=a.min[k]))return null;
  const candidates=axes.flatMap(k=>[
    {axis:k,amount:a.min[k]-b.max[k]-margin},
    {axis:k,amount:a.max[k]-b.min[k]+margin}
  ]);
  return candidates.sort((x,y)=>Math.abs(x.amount)-Math.abs(y.amount))[0];
}
