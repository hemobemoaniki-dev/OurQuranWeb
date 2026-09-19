import React from "react";
import { useTheme } from "@/src/theme";

export type IconName = string;

type SvgChild = React.ReactElement;

const common = {
  fill: "none",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function line(x1:number,y1:number,x2:number,y2:number,color:string): SvgChild {
  return React.createElement("line",{x1,y1,x2,y2,stroke:color,...common});
}
function path(d:string,color:string,fill="none"): SvgChild {
  return React.createElement("path",{d,stroke:color,fill,...common});
}
function circle(cx:number,cy:number,r:number,color:string,fill="none"): SvgChild {
  return React.createElement("circle",{cx,cy,r,stroke:color,fill,...common});
}
function rect(x:number,y:number,width:number,height:number,rx:number,color:string,fill="none"): SvgChild {
  return React.createElement("rect",{x,y,width,height,rx,stroke:color,fill,...common});
}
function poly(points:string,color:string,fill="none"): SvgChild {
  return React.createElement("polyline",{points,stroke:color,fill,...common});
}

function glyph(name:string,color:string): SvgChild[] {
  switch(name){
    case "home-variant-outline":
      return [path("M3 11.2 12 4l9 7.2",color),path("M5.4 10.1V20h5v-5.7h3.2V20h5v-9.9",color)];
    case "book-open-page-variant-outline":
    case "book-open-page-variant":
      return [path("M4 5.5c2.7-.8 5.2-.2 8 1.8v12c-2.8-2-5.3-2.6-8-1.8z",color),path("M20 5.5c-2.7-.8-5.2-.2-8 1.8v12c2.8-2 5.3-2.6 8-1.8z",color)];
    case "hands-pray":
      return [path("M8.4 3.5 10.8 12 8 20",color),path("M15.6 3.5 13.2 12 16 20",color),path("M10.8 12h2.4",color),path("M7 20h10",color)];
    case "star-crescent":
      return [path("M15.8 4.5a7.4 7.4 0 1 0 3.6 12.8 6 6 0 1 1-3.6-12.8Z",color),path("m17.4 7.4.8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.2Z",color)];
    case "tune-variant":
      return [line(4,7,20,7,color),circle(9,7,2,color),line(4,12,20,12,color),circle(15,12,2,color),line(4,17,20,17,color),circle(11,17,2,color)];
    case "arrow-left": return [poly("10 5 3 12 10 19",color),line(4,12,21,12,color)];
    case "arrow-right": return [poly("14 5 21 12 14 19",color),line(3,12,20,12,color)];
    case "chevron-left": return [poly("15 5 8 12 15 19",color)];
    case "chevron-right": return [poly("9 5 16 12 9 19",color)];
    case "chevron-down": return [poly("5 9 12 16 19 9",color)];
    case "check": return [poly("4 12.5 9.2 17.5 20 6.5",color)];
    case "minus": return [line(5,12,19,12,color)];
    case "check-circle":
      return [circle(12,12,9,color),poly("7.8 12.2 10.6 15 16.5 9",color)];
    case "crown":
      return [path("M4 8.5 8.2 12 12 5l3.8 7L20 8.5l-1.4 9H5.4Z",color),line(6,20,18,20,color)];
    case "heart":
      return [path("M12 20.2 4.6 13C1 9.5 3.2 4.8 7.4 4.8c2.2 0 3.7 1.2 4.6 2.6.9-1.4 2.4-2.6 4.6-2.6 4.2 0 6.4 4.7 2.8 8.2Z",color,color)];
    case "heart-outline":
      return [path("M12 20.2 4.6 13C1 9.5 3.2 4.8 7.4 4.8c2.2 0 3.7 1.2 4.6 2.6.9-1.4 2.4-2.6 4.6-2.6 4.2 0 6.4 4.7 2.8 8.2Z",color)];
    case "clock-outline":
      return [circle(12,12,9,color),line(12,7,12,12,color),line(12,12,16,14,color)];
    case "calendar-check-outline":
      return [rect(4,5,16,15,2,color),line(8,3,8,7,color),line(16,3,16,7,color),line(4,9,20,9,color),poly("8 14 10.5 16.5 16 12",color)];
    case "target":
      return [circle(12,12,9,color),circle(12,12,5,color),circle(12,12,1.5,color,color)];
    case "trophy-outline":
      return [path("M8 5h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5Z",color),path("M8 7H5v2c0 2 1.3 3.5 3.3 3.5",color),path("M16 7h3v2c0 2-1.3 3.5-3.3 3.5",color),line(12,15,12,19,color),line(8,20,16,20,color)];
    case "pencil-outline":
      return [path("m5 16.5-.8 3.3 3.3-.8L18.7 7.8 16.2 5.3Z",color),line(14.8,6.7,17.3,9.2,color)];
    case "fire":
      return [path("M13.2 3.4c.7 4-2.6 5-1 8.1 1-1.4 2-2 3.2-3.6 2.6 2.1 4 4.4 3.6 7.2-.5 3.4-3.4 5.8-7 5.8-3.8 0-6.8-2.6-7-6.1-.1-2.7 1.2-5 4.1-7.7-.3 3.2 1 4.4 2.2 5.1-.5-3.7.7-5.7 1.9-8.8Z",color)];
    case "menu": return [line(4,7,20,7,color),line(4,12,20,12,color),line(4,17,20,17,color)];
    case "mosque":
      return [path("M5 20v-7h14v7",color),path("M8 13V9c0-2.4 1.8-4.2 4-5 2.2.8 4 2.6 4 5v4",color),path("M10 20v-4h4v4",color),line(3,20,21,20,color),line(12,4,12,2,color)];
    case "bell-outline":
      return [path("M6 16h12l-1.4-2.2V10a4.6 4.6 0 0 0-9.2 0v3.8Z",color),path("M10 19c.5.8 1.1 1.2 2 1.2s1.5-.4 2-1.2",color)];
    case "account":
      return [circle(12,8,3.2,color),path("M5 20c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3",color)];
    case "account-remove-outline":
      return [circle(9,8,3,color),path("M3.5 19c.6-3.6 2.5-5.4 5.5-5.4 2.1 0 3.6.8 4.6 2.4",color),line(16,15,21,20,color),line(21,15,16,20,color)];
    case "logout":
      return [path("M10 5H5v14h5",color),line(10,12,21,12,color),poly("17 8 21 12 17 16",color)];
    case "delete-sweep-outline":
      return [path("M7 8v11h8V8",color),line(5,6,17,6,color),path("M9 6V4h4v2",color),line(17,12,22,12,color),line(18,16,22,16,color)];
    case "email-outline":
      return [rect(3,5,18,14,2,color),poly("4 7 12 13 20 7",color)];
    case "google":
      return [circle(12,12,9,color),path("M12 7.5a4.5 4.5 0 1 0 0 9c2.4 0 4-1.5 4.3-3.5H12",color),line(12,11.5,20,11.5,color)];
    case "restore":
      return [path("M6.5 8H3V4.5",color),path("M3.6 8A9 9 0 1 1 5 17",color),line(12,8,12,13,color),line(12,13,16,15,color)];
    case "shield-check":
      return [path("M12 3 19 6v5c0 4.5-2.6 7.8-7 10-4.4-2.2-7-5.5-7-10V6Z",color),poly("8.3 12.2 10.7 14.5 15.8 9.5",color)];
    case "alert-circle-outline":
      return [circle(12,12,9,color),line(12,7,12,13,color),circle(12,17,0.8,color,color)];
    case "microphone-outline":
      return [rect(9,3,6,11,3,color),path("M6.5 11.5a5.5 5.5 0 0 0 11 0",color),line(12,17,12,21,color),line(9,21,15,21,color)];
    case "palette-outline":
      return [path("M12 3a9 9 0 0 0 0 18h1.2a2 2 0 0 0 1.6-3.2 1.9 1.9 0 0 1 1.5-3h1.3A3.4 3.4 0 0 0 21 11.4 8.5 8.5 0 0 0 12 3Z",color),circle(8,9,1,color),circle(12,7,1,color),circle(16,9,1,color)];
    case "speedometer":
      return [path("M4 17a8.5 8.5 0 1 1 16 0",color),line(12,13,17,8,color),circle(12,13,1,color,color)];
    case "play-circle-outline":
      return [circle(12,12,9,color),path("m10 8 6 4-6 4Z",color)];
    case "play": return [path("m8 5 11 7-11 7Z",color,color)];
    case "pause-circle": return [circle(12,12,9,color),line(10,8,10,16,color),line(14,8,14,16,color)];
    case "volume-high":
      return [path("M4 10v4h4l5 4V6L8 10Z",color),path("M16 9c1 .8 1.5 1.8 1.5 3S17 14.2 16 15",color),path("M18.5 6.8c1.8 1.4 2.7 3.1 2.7 5.2s-.9 3.8-2.7 5.2",color)];
    case "content-copy":
      return [rect(7,7,12,13,2,color),path("M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",color)];
    case "share-variant-outline":
      return [circle(18,5,2,color),circle(6,12,2,color),circle(18,19,2,color),line(8,11,16,6,color),line(8,13,16,18,color)];
    case "weather-night":
      return [path("M16.5 4.2A8 8 0 1 0 20 16.8a7 7 0 1 1-3.5-12.6Z",color)];
    case "white-balance-sunny":
      return [circle(12,12,4,color),line(12,2,12,5,color),line(12,19,12,22,color),line(2,12,5,12,color),line(19,12,22,12,color),line(5,5,7,7,color),line(17,17,19,19,color),line(17,7,19,5,color),line(5,19,7,17,color)];
    case "cellphone":
      return [rect(7,2,10,20,2,color),line(10,19,14,19,color)];
    case "chart-box-outline":
      return [rect(3,3,18,18,2,color),line(7,16,7,12,color),line(12,16,12,8,color),line(17,16,17,6,color)];
    case "star-four-points":
      return [path("M12 2c.7 5.8 2.2 7.3 8 8-5.8.7-7.3 2.2-8 8-.7-5.8-2.2-7.3-8-8 5.8-.7 7.3-2.2 8-8Z",color,color)];
    default:
      return [circle(12,12,8.5,color),circle(12,12,2.2,color,color)];
  }
}

export function preloadIconFont(){ return Promise.resolve(); }
export function getTabIconSource(){ return null; }

export function Icon({name,size=22,color}:{name:IconName;size?:number;color?:string}){
  const { colors } = useTheme();
  const tint=color ?? colors.onSurface;
  return React.createElement(
    "svg",
    {
      width:size,
      height:size,
      viewBox:"0 0 24 24",
      fill:"none",
      xmlns:"http://www.w3.org/2000/svg",
      role:"img",
      "aria-hidden":true,
      focusable:false,
      style:{display:"block",flexShrink:0}
    },
    ...glyph(name,tint)
  );
}
