export interface UpdateObject{
     user_id : number,
    first_name : string,
    last_name : string,
    bio : Text,
    user_name : string,
    profile_path? : string | null | undefined,
    cover_pic_path? : string | null | undefined
}