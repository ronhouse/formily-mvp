import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Style {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  material: string;
  price: number;
  imageUrl: string;
}

interface StyleSelectorProps {
  styles: Style[];
  selectedStyle: string;
  onStyleSelect: (styleId: string) => void;
}

const STYLE_OPTIONS: Style[] = [
  {
    id: 'hunting_trophy',
    name: 'Hunting Trophy',
    description: 'Detailed busts and trophies from your hunt photos',
    dimensions: '6" x 4" x 4"',
    material: 'PLA+ Plastic',
    price: 34.99,
    imageUrl: '/assets/generated_images/3D_printed_hunting_trophy_f8d62b75.png?v=2',
  },
  {
    id: 'pet_sculpture',
    name: 'Pet Sculpture',
    description: 'Memorial statues and keepsakes of beloved pets',
    dimensions: '4" x 3" x 3"',
    material: 'PETG Plastic',
    price: 28.99,
    imageUrl: '/assets/generated_images/3D_printed_pet_memorial_c1dadd77.png?v=2',
  },
  {
    id: 'keepsake_3d',
    name: '3D Keepsake',
    description: 'Custom figurines from family moments and memories',
    dimensions: '3" x 2" x 2"',
    material: 'PLA Plastic',
    price: 22.99,
    imageUrl: '/assets/generated_images/3D_printed_family_keepsake_b65fdf6c.png?v=2',
  },
];

export function StyleSelector({ selectedStyle, onStyleSelect }: Omit<StyleSelectorProps, 'styles'>) {
  const selectedStyleData = STYLE_OPTIONS.find(style => style.id === selectedStyle);

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {STYLE_OPTIONS.map((style) => (
          <Card 
            key={style.id}
            className={`cursor-pointer transition-colors relative ${
              selectedStyle === style.id 
                ? 'border-2 border-primary bg-primary/5' 
                : 'border-2 border-gray-200 hover:border-primary'
            }`}
            onClick={() => onStyleSelect(style.id)}
          >
            <CardContent className="p-6">
              <div className="text-center">
                <img 
                  src={style.imageUrl} 
                  alt={`${style.name} example`} 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-gray-900 mb-2">{style.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{style.description}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Size: {style.dimensions}</p>
                  <p>Material: {style.material}</p>
                  <p className="font-medium text-primary">${style.price}</p>
                </div>
                {selectedStyle === style.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStyleData && (
        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Selected Style: {selectedStyleData.name}</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Dimensions</p>
                <p className="font-medium">{selectedStyleData.dimensions}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Material</p>
                <p className="font-medium">{selectedStyleData.material}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Print Time</p>
                <p className="font-medium">~45 minutes</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Price</p>
                <p className="font-medium text-primary">${selectedStyleData.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { STYLE_OPTIONS };
