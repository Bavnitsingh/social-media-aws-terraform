export interface Tweet{
    tweet_id:number,
user_id?: number,
content:Text
media_path?:string
parent_id?:number
source_id?:number
tweet_type?:string,
created_at? : Date
}