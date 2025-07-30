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
    id: 'keychain',
    name: 'Keychain',
    description: 'Perfect for keys, bags, or gifts',
    dimensions: '2" x 1.5" x 0.2"',
    material: 'PLA Plastic',
    price: 12.99,
    imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
  },
  {
    id: 'tag',
    name: 'Pet Tag',
    description: 'Durable ID tags for pets',
    dimensions: '1.5" x 1.2" x 0.15"',
    material: 'PETG Plastic',
    price: 15.99,
    imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
  },
  {
    id: 'plaque',
    name: 'Decorative Plaque',
    description: 'Wall art and displays',
    dimensions: '4" x 3" x 0.3"',
    material: 'PLA+ Plastic',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
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
