import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS=["/login","/forgot-password","/reset-password"];
function isPublicAuthPath(pathname:string){return PUBLIC_AUTH_PATHS.some(path=>pathname===path||pathname.startsWith(path+"/"));}

export async function middleware(request:NextRequest){
 request.headers.set("x-pathname",request.nextUrl.pathname);
 if(isPublicAuthPath(request.nextUrl.pathname)) return NextResponse.next({request});
 let response=NextResponse.next({request});
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
  cookies:{getAll(){return request.cookies.getAll();},setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}
 });
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){const url=new URL("/login",request.url);url.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(url);}
 const {data:staff}=await supabase.from("platform_staff").select("user_id,role").eq("user_id",user.id).maybeSingle();
 if(staff) return response;
 if(request.nextUrl.pathname.startsWith("/school-admin")){
  const {data:membership}=await supabase.from("school_memberships").select("school_id,role").eq("user_id",user.id).eq("active",true).in("role",["school_admin","school_lead"]).maybeSingle();
  if(membership) return response;
 }
 const url=new URL("/login",request.url);url.searchParams.set("error","not-authorized");return NextResponse.redirect(url);
}
export const config={matcher:["/((?!_next|favicon.ico).*)"]};
