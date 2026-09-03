import { NextResponse } from 'next/server'

// Mock data for testing UI
const mockVideos = [
  { title: "Amateur Couple Homemade", thumbnail: "https://picsum.photos/seed/vid1/640/360", duration: "12:34", views: "1.2M" },
  { title: "Teen First Time", thumbnail: "https://picsum.photos/seed/vid2/640/360", duration: "8:21", views: "856K" },
  { title: "Milf Next Door", thumbnail: "https://picsum.photos/seed/vid3/640/360", duration: "15:47", views: "2.1M" },
  { title: "Lesbian Massage", thumbnail: "https://picsum.photos/seed/vid4/640/360", duration: "22:10", views: "3.4M" },
  { title: "Big Ass Pawg", thumbnail: "https://picsum.photos/seed/vid5/640/360", duration: "10:55", views: "1.8M" },
  { title: "Anal Training", thumbnail: "https://picsum.photos/seed/vid6/640/360", duration: "18:33", views: "967K" },
  { title: "Blowjob Compilation", thumbnail: "https://picsum.photos/seed/vid7/640/360", duration: "25:00", views: "4.2M" },
  { title: "Rough Fuck", thumbnail: "https://picsum.photos/seed/vid8/640/360", duration: "14:22", views: "1.5M" },
  { title: "Creampie Surprise", thumbnail: "https://picsum.photos/seed/vid9/640/360", duration: "9:45", views: "2.3M" },
  { title: "Threesome Fun", thumbnail: "https://picsum.photos/seed/vid10/640/360", duration: "20:15", views: "1.9M" },
  { title: "Doggy Style Deep", thumbnail: "https://picsum.photos/seed/vid11/640/360", duration: "11:30", views: "1.1M" },
  { title: "Cowgirl Riding", thumbnail: "https://picsum.photos/seed/vid12/640/360", duration: "13:18", views: "2.7M" },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'amateur'
  
  // Return mock data filtered by query for now
  const filtered = mockVideos.filter(v => 
    v.title.toLowerCase().includes(query.toLowerCase()) || 
    Math.random() > 0.5
  )
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500))
  
  return NextResponse.json(filtered.length > 0 ? filtered : mockVideos)
}