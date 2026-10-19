import { QueryResult, ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../database/db.js";
import { Request,Response } from "express";
import { User } from "../Interfaces/auth.interface.js";
import { UpdateObject } from "../Interfaces/updateObject.interface.js";
import { verifyToken } from "../utils/jwt.utils.js";
import { JwtPayload } from "jsonwebtoken";
 


    export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) return undefined;
  const row = rows[0];
  return {
    user_id: row?.user_id,
    email: row?.email,
    password_hash: row?.password_hash,
    user_name:row?.user_name,
    first_name:row?.first_name,
    last_name:row?.last_name,
    phone_number:row?.phone_number
  };
};

export const createUser = async (user: User): Promise<any> => {
  
  try {

      const [result] = await db.execute(
    "INSERT INTO users ( email, password_hash,first_name,last_name,user_name,phone_number,timezone) VALUES (?, ?, ?,?,?,?,?)",
    [ user.email, user.password_hash,user.first_name,user.last_name,user.user_name,user.phone_number,user.timezone] as any[]
  );
   const insertedId = (result as ResultSetHeader).insertId;
    return { user_id: insertedId, ...user };


}
  catch (error) {
console.log(error)
return {
  status : 500,
  message : 'Error in Creating User '
}
  
  } 
 
}

export const findUserById = async (user_id : number): Promise<User | undefined> =>{
const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT *  FROM users WHERE user_id = ? LIMIT 1",
    [user_id]
  );

  if (rows.length === 0) return undefined;
  const row = rows[0];
  return {
    user_id: row?.user_id,
    email: row?.email,
    password_hash: row?.password_hash,
    user_name:row?.user_name,
    first_name:row?.first_name,
    last_name:row?.last_name,
    bio:row?.bio,
    phone_number:row?.phone_number,
    profile_path:row?.profile_path,
    cover_pic_path:row?.cover_pic_path,
    created_at : row?.created_at
  };
};

export const updateUser = async (data : UpdateObject ):Promise<Object>=>{

  try {
    const values : any = [data.first_name ?? null,data.last_name ?? null,data.bio ?? null,data.profile_path ?? null,data.cover_pic_path ?? null,data.user_id ?? null];
    const sql:any = 'update users set first_name = ?,last_name = ?, bio = ?,profile_path = ?,cover_pic_path=? where user_id = ?';
    const [result] = await db.execute<ResultSetHeader>(sql,values)
  return {
  status : 200,
  message : 'User Updated successfully'
} 

  } catch (error) {
    console.log(error);
    return {
  status : 500,
  message : 'Error in Updating User '
}
  }
}

export const fetchUserIdFromToken = async (req:Request)=> {
  try {
    const token = req.cookies.jwt;
    const payload = verifyToken(token);
    const {user_id} = payload as JwtPayload; 
    return user_id
  } catch (error) {
    return 'Token not found'
  }
}


export const fetchTimezoneOfUser = async (user_id : number)=>{
  try {
    const sql = `select timezone from users where user_id = ?`;
    const [timezone]:any = await db.execute<ResultSetHeader>(sql,[user_id]);
    return timezone[0].timezone;
  } catch (error) {
    return {
      status : 404,
      message : 'No Timezone found'
    }
  }
}
export const fetchPasswordHash = async (user_id:number)=>{
  try {
    const sql= `select password_hash from users where user_id = ?`;
    const [password_hash]:any = await db.execute(sql,[user_id]);
    return password_hash[0].password_hash;
  } catch (error) {
    return {
      status:404,
      message:'Password hash not found'
    }
  }
}