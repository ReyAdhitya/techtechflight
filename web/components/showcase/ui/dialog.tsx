'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'

/**
 * shadcn's Dialog surface. Radix keeps focus trapping, Escape and the scroll lock;
 * the showcase only re-skins it.
 */
export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal
export const DialogOverlay = DialogPrimitive.Overlay
export const DialogContent = DialogPrimitive.Content
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
