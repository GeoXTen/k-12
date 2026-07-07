(async()=>{
const W=["47336c9d-7607-4478-b37c-018049af1e46","ff598c4d-ccaf-40c1-bfaa-cb94565764b1","1e595494-2426-4946-b688-58ba75604bcc","444437a7-c08b-423e-a2c8-65c17383ba24","696cc59b-a475-44b0-b206-4e03593e658f","42822f8a-b530-4649-97ea-83aac42ecf6d","b49cd6d8-b52d-4c21-93d7-89cc19b5e18e","5e4c9b31-1b4e-4887-839b-607597928d7c","a0a16bc9-e1b1-45f0-b269-812b53f60121","8064da55-e484-4ba0-a0bc-db05ee84462b","4fdf7f85-38d1-4eea-aeb9-f50939ffb9d8","e1fbfed6-86a4-49b0-868d-17c396358d57","59208eb6-ec43-4d87-9289-dbd9e250bdd6","2c82c020-e1bc-4363-9502-a6794405f793","9901799e-e832-48b1-9278-9abe73168708","c72dcdb4-63a0-40b7-b0bb-ccce3ca54984","2b636e76-a87b-4222-b536-2dc4a545109f","4779b1d7-3109-4ecb-957f-80262f4d7161","ae67aa09-f3d3-4895-977d-9ca44ed1d996","6daa08c1-59c8-4e06-9bc8-9d7246a63057","521ffc8f-9612-4950-84ed-95773138eca6","eb6642e8-b4a6-4652-9c18-67099f2781cc","83bec9de-395a-44e6-9a30-189508c22b99"];

const r=await fetch("/api/auth/session",{credentials:"include"});
const{accessToken:t}=await r.json();
if(!t){console.error("No token!");return}
console.log("Token OK");

// Get current workspaces
console.log("Fetching your workspaces...");
const ar=await fetch("/backend-api/accounts",{headers:{"authorization":`Bearer ${t}`},credentials:"include"});
const accounts=await ar.json();
const myIds=new Set(accounts.map(a=>a.id));
console.log("You are in",myIds.size,"workspaces");

// Filter out already joined
const todo=W.filter(id=>!myIds.has(id));
console.log(W.length-todo.length,"already joined,",todo.length,"to invite");

if(!todo.length){console.log("Nothing to do!");return}

// Invite to remaining
for(let i=0;i<todo.length;i++){
try{
const r=await fetch(`/backend-api/accounts/${todo[i]}/invites/request`,{method:"POST",headers:{"accept":"*/*","authorization":`Bearer ${t}`,"cache-control":"no-cache","pragma":"no-cache"},credentials:"include"});
const d=await r.json();
console.log(`[${i+1}/${todo.length}] ${todo[i]}:`,JSON.stringify(d));
}catch(e){console.error(`[${i+1}/${todo.length}] ERROR:`,e.message)}
if(i<todo.length-1)await new Promise(r=>setTimeout(r,1000));
}
console.log("Done!");
})();
