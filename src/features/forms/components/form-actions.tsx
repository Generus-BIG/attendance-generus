import { useState } from 'react'
import { MoreHorizontal, SquarePen, Trash2, Link, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFormsContext } from '../context/forms-context'
import type { AttendanceFormConfig } from '@/lib/schema'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormDialogs } from './form-dialogs'

interface FormActionsProps {
    form: AttendanceFormConfig
}

export function FormActions({ form }: FormActionsProps) {
    const [openDelete, setOpenDelete] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const { deleteForm, updateForm } = useFormsContext()

    const copyLink = () => {
        const url = `${window.location.origin}/absensi/${form.slug}`
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
    }

    const toggleStatus = () => {
        updateForm({ ...form, isActive: !form.isActive })
        toast.success(`Form ${form.isActive ? 'deactivated' : 'activated'}`)
    }

    const handleDelete = async () => {
        try {
            await deleteForm(form.id)
            setOpenDelete(false)
        } catch {
            // Error is already handled by the mutation's onError
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant='ghost' className='h-8 w-8 p-0'>
                        <span className='sr-only'>Open menu</span>
                        <MoreHorizontal className='h-4 w-4' />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => copyLink()}>
                        <Link className='mr-2 h-4 w-4' /> Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <SquarePen className='mr-2 h-4 w-4' /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus()}>
                        <Power className='mr-2 h-4 w-4' /> {form.isActive ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenDelete(true)} className='text-red-600 focus:text-red-600'>
                        <Trash2 className='mr-2 h-4 w-4' /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the form
                            "{form.title}" and potentially remove associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className='bg-red-600'>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <FormDialogs open={openEdit} setOpen={setOpenEdit} formToEdit={form} />
        </>
    )
}
