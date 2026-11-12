import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 const auth=req.headers.get("Authorization"); if(!auth) return json({error:"Nicht authentifiziert"},401);
 const body=await req.json().catch(()=>null);
 const name=typeof body?.name==="string"?body.name.trim():"";
 const emailDomain=typeof body?.emailDomain==="string"?body.emailDomain.trim().toLowerCase().replace(/^@/,""):"";
 if(!name) return json({error:"Schulname ist erforderlich"},400);
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key) return json({error:"Supabase Server-Konfiguration fehlt"},500);
 const admin=createClient(url,key), token=auth.replace(/^Bearer\s+/i,"").trim();
 const {data:{user},error:userError}=await admin.auth.getUser(token);
 if(userError||!user) return json({error:"Ungültige Sitzung"},401);
 const {data:staff}=await admin.from("platform_staff").select("role").eq("user_id",user.id).eq("role","platform_admin").maybeSingle();
 if(!staff) return json({error:"Nur Platform-Admins dürfen Schulen anlegen"},403);
 const {data:school,error}=await admin.from("schools").insert({
   name, email_domain:emailDomain||null, region:typeof body?.region==="string"?body.region.trim()||null:null,
   school_type:typeof body?.schoolType==="string"?body.schoolType||null:null,
   street:typeof body?.street==="string"?body.street.trim()||null:null,
   house_number:typeof body?.houseNumber==="string"?body.houseNumber.trim()||null:null,
   postal_code:typeof body?.postalCode==="string"?body.postalCode.trim()||null:null,
   city:typeof body?.city==="string"?body.city.trim()||null:null,
   phone:typeof body?.phone==="string"?body.phone.trim()||null:null,
   website:typeof body?.website==="string"?body.website.trim()||null:null
 }).select("id,name,region,email_domain,school_type,street,house_number,postal_code,city,phone,website,status,plan,funding_type").single();
 if(error||!school) return json({error:error?.message??"Schule konnte nicht angelegt werden"},500);
 return json({school});
});