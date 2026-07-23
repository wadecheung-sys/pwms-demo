function e(s,i){if(s.permissions.includes("*")||s.permissions.includes(i))return!0;const[n]=i.split(":");return s.permissions.includes(n)}export{e as h};
