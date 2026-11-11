import { useEffect } from "react";
import { watchKeyboardClearance } from "../../lib/keyboardClearance2029.js";
import "./keyboardClearance2029.css";

// The bottom bar steps aside while the on-screen keyboard is open (the pure logic and its tests live in src/lib/keyboardClearance2029.js).
export default function useKeyboardClearance2029() { useEffect(() => watchKeyboardClearance(), []); }
