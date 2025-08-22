// src/app/api/share/[noteId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureInvite, joinNoteWithToken, createInviteUrl } from "@/lib/share";
import { useAuth } from "@/hooks/useAuth";

// For now, we'll use a simplified auth approach since Firebase Admin setup can be complex
// In production, you'd want proper server-side auth validation

/**
 * POST /api/share/[noteId] - Create or get invite link for a note
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;
    const body = await req.json();
    const { uid } = body; // In production, get this from verified auth token
    
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify user owns or has access to the note
    const noteRef = doc(db, "notes", noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    
    const noteData = noteSnap.data();
    
    // Check if user is the owner or a member
    if (noteData['ownerUid'] !== uid && (!noteData['members'] || !noteData['members'].includes(uid))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Ensure invite token exists
    const invite = await ensureInvite(noteId);
    
    // Create invite URL
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const inviteUrl = createInviteUrl(noteId, invite.token, origin);
    
    return NextResponse.json({
      inviteUrl,
      token: invite.token,
      expiresAt: invite.expiresAt.toDate().toISOString()
    });
    
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/share/[noteId] - Join a note using invite token
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;
    const body = await req.json();
    const { uid, token } = body; // In production, get uid from verified auth token
    
    if (!uid || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Attempt to join the note
    const result = await joinNoteWithToken(noteId, uid, token);
    
    if (!result.success) {
      const statusCode = result.error === "Note not found" ? 404 :
                        result.error === "Invalid invite token" ? 403 :
                        result.error === "Invite token has expired" ? 410 :
                        result.error === "Room is full (maximum 2 members)" ? 409 :
                        400;
      
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error joining note:", error);
    return NextResponse.json(
      { error: "Failed to join note" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share/[noteId] - Get note info for sharing (optional)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get note info
    const noteRef = doc(db, "notes", noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    
    const noteData = noteSnap.data();
    
    // Check if user has access
    if (noteData['ownerUid'] !== uid && (!noteData['members'] || !noteData['members'].includes(uid))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    return NextResponse.json({
      id: noteId,
      title: noteData['title'],
      memberCount: noteData['members'] ? noteData['members'].length : 0,
      maxMembers: 2,
      hasInvite: !!noteData['invite'],
      inviteExpired: noteData['invite'] ? new Date(noteData['invite'].expiresAt.toDate()) < new Date() : false
    });
    
  } catch (error) {
    console.error("Error getting note info:", error);
    return NextResponse.json(
      { error: "Failed to get note info" },
      { status: 500 }
    );
  }
}