import { useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '../../lib/storageEngine';
import { Animal, AnimalCategory, HazardRating, ConservationStatus } from '../../types';
import { batchGetSpeciesData } from '../../services/geminiService';
import { mutateOnlineFirst } from '../../lib/dataEngine';

export const animalFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  latin_name: z.string().optional(),
  category: z.nativeEnum(AnimalCategory),
  dob: z.string().optional(),
  is_dob_unknown: z.boolean(),
  sex: z.enum(['Male', 'Female', 'Unknown']),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  special_requirements: z.string().optional(),
  image_url: z.string().optional(),
  distribution_map_url: z.string().optional(),
  acquisition_date: z.string().min(1, 'Acquisition date is required'),
  origin: z.string().min(1, 'Origin is required'),
  sire_id: z.string().optional(),
  dam_id: z.string().optional(),
  microchip_id: z.string().optional(),
  ring_number: z.string().optional(),
  has_no_id: z.boolean(),
  hazard_rating: z.nativeEnum(HazardRating),
  is_venomous: z.boolean(),
  red_list_status: z.nativeEnum(ConservationStatus),
  is_group_animal: z.boolean(),
  display_order: z.number(),
  archived: z.boolean(),
  is_quarantine: z.boolean(),
  water_tipping_temp: z.number().optional(),
  target_day_temp_c: z.number().optional(),
  target_night_temp_c: z.number().optional(),
  target_humidity_min_percent: z.number().optional(),
  target_humidity_max_percent: z.number().optional(),
  misting_frequency: z.string().optional(),
  group_name: z.string().optional(),
  acquisition_type: z.enum(['BORN', 'TRANSFERRED_IN', 'RESCUE', 'UNKNOWN']).optional(),
});

export type AnimalFormData = z.infer<typeof animalFormSchema>;

interface UseAnimalFormProps {
  initialData?: Animal | null;
  onClose: () => void;
}

export function useAnimalForm({ initialData, onClose }: UseAnimalFormProps) {
  const [isAiPending, startAiTransition] = useTransition();

  const form = useForm<AnimalFormData>({
    resolver: zodResolver(animalFormSchema),
    defaultValues: initialData ? {
      name: initialData.name || '',
      species: initialData.species || '',
      latin_name: initialData.latin_name || '',
      category: initialData.category || AnimalCategory.OWLS,
      dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : '',
      is_dob_unknown: initialData.is_dob_unknown || false,
      sex: initialData.sex || 'Unknown',
      location: initialData.location || '',
      description: initialData.description || '',
      special_requirements: initialData.special_requirements || '',
      image_url: initialData.image_url || '',
      distribution_map_url: initialData.distribution_map_url || '',
      acquisition_date: initialData.acquisition_date ? new Date(initialData.acquisition_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      origin: initialData.origin || '',
      sire_id: initialData.sire_id || '',
      dam_id: initialData.dam_id || '',
      microchip_id: initialData.microchip_id || '',
      ring_number: initialData.ring_number || '',
      has_no_id: initialData.has_no_id || false,
      hazard_rating: initialData.hazard_rating || HazardRating.LOW,
      is_venomous: initialData.is_venomous || false,
      red_list_status: initialData.red_list_status || ConservationStatus.NE,
      is_group_animal: initialData.is_group_animal || false,
      display_order: initialData.display_order || 0,
      archived: initialData.archived || false,
      is_quarantine: initialData.is_quarantine || false,
      water_tipping_temp: initialData.water_tipping_temp,
      group_name: initialData.group_name || '',
      acquisition_type: initialData.acquisition_type || 'UNKNOWN',
    } : {
      name: '',
      species: '',
      latin_name: '',
      category: AnimalCategory.OWLS,
      dob: new Date().toISOString().split('T')[0],
      is_dob_unknown: false,
      sex: 'Unknown',
      location: '',
      description: '',
      special_requirements: '',
      image_url: `https://picsum.photos/seed/${uuidv4()}/400/400`,
      distribution_map_url: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      origin: '',
      sire_id: '',
      dam_id: '',
      microchip_id: '',
      ring_number: '',
      has_no_id: false,
      hazard_rating: HazardRating.LOW,
      is_venomous: false,
      red_list_status: ConservationStatus.NE,
      is_group_animal: false,
      display_order: 0,
      archived: false,
      is_quarantine: false,
      water_tipping_temp: undefined,
      group_name: '',
      acquisition_type: 'UNKNOWN',
    },
  });

  const species = form.watch('species');
  const redListStatus = form.watch('red_list_status');

  useEffect(() => {
    if (species && (redListStatus === ConservationStatus.NE || !redListStatus)) {
      startAiTransition(async () => {
        try {
          const data = await batchGetSpeciesData([species]);
          if (data[species]) {
            form.setValue('latin_name', data[species].latin_name, { shouldDirty: true });
            form.setValue('red_list_status', data[species].conservation_status as ConservationStatus, { shouldDirty: true });
          }
        } catch (error) {
          console.error('AI Autofill failed:', error);
        }
      });
    }
  }, [species, redListStatus]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'distribution_map_url') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadFile(file, 'animals');
        form.setValue(field, url, { shouldDirty: true });
      } catch (error) {
        console.error('Upload failed:', error);
        // alert('Failed to upload image. Please try again.');
      }
    }
  };

  const onSubmit = async (data: AnimalFormData) => {
    try {
      const animalData: Animal = {
        ...initialData,
        ...data,
        id: initialData?.id || uuidv4(),
        weight_unit: initialData?.weight_unit || 'g',
      } as Animal;

      await mutateOnlineFirst('animals', animalData, 'upsert');
      
      onClose();
    } catch (error) {
      console.error('Failed to save animal:', error);
    }
  };

  return {
    form,
    isAiPending,
    handleImageUpload,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
}
