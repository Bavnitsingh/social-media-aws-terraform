export interface User {
  user_id?: number;
  email: string;
  password_hash: string;
  user_name:string,
  first_name : string,
  last_name : string,
  phone_number : number,
  bio?:Text,
  profile_path?:string|null,
  timezone?:string
  cover_pic_path?:string|null,
  created_at ?:Date
}