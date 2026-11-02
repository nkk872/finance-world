"use client";

import { useState } from "react";

type Props={src:string;fallback:string;alt:string;className?:string};

export default function ArticleImage({src,fallback,alt,className}:Props){
 const [failed,setFailed]=useState(false);
 return <img className={className} src={failed?fallback:src} alt={alt} onError={()=>{if(!failed)setFailed(true);}} />;
}
